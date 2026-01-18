import { useMemo, useState, useEffect, useRef } from "react";
import { Send, Users, MessageSquare, Loader2, Trash2 } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  message_text: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

interface Room {
  id: string;
  name: string;
  class_id: string | null;
}

export default function StudentDiscussions() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const STORAGE_KEY = "learniverse.discussions.clearedAfterByRoomId";
  const [clearedAfterByRoomId, setClearedAfterByRoomId] = useState<Record<string, string>>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      return parsed as Record<string, string>;
    } catch {
      return {};
    }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const senderNameCacheRef = useRef<Map<string, string>>(new Map());
  const senderLookupLastAttemptRef = useRef<Map<string, number>>(new Map());

  const persistClearedAfter = (next: Record<string, string>) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage issues
    }
  };

  const addMessageOnce = (msg: Message) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  };

  const visibleMessages = useMemo(() => {
    if (!selectedRoom) return messages;
    const clearedAfter = clearedAfterByRoomId[selectedRoom.id];
    if (!clearedAfter) return messages;
    const threshold = new Date(clearedAfter).getTime();
    if (!Number.isFinite(threshold)) return messages;
    return messages.filter((m) => new Date(m.created_at).getTime() > threshold);
  }, [messages, selectedRoom, clearedAfterByRoomId]);

  const enrichMessagesWithSenderNames = async (rawMessages: Message[]) => {
    const senderIds = Array.from(new Set(rawMessages.map((m) => m.sender_id)));
    const now = Date.now();
    const missingSenderIds = senderIds.filter((id) => {
      const cached = senderNameCacheRef.current.get(id);
      // If we previously fell back to Anonymous, retry occasionally in case profiles
      // were temporarily unavailable (e.g., RLS policy not yet applied).
      if (!cached || cached === "Anonymous") {
        const lastAttempt = senderLookupLastAttemptRef.current.get(id) || 0;
        return now - lastAttempt > 5_000;
      }
      return false;
    });

    if (missingSenderIds.length > 0) {
      missingSenderIds.forEach((id) => senderLookupLastAttemptRef.current.set(id, now));
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", missingSenderIds);

      if (error) {
        // Don't block chat on profile lookup failures
        console.warn("Failed to load sender profiles; falling back to Anonymous", error);
      } else {
        (profiles || []).forEach((p) => {
          senderNameCacheRef.current.set(p.user_id, p.full_name || "Anonymous");
        });
        missingSenderIds.forEach((id) => {
          if (!senderNameCacheRef.current.has(id)) {
            senderNameCacheRef.current.set(id, "Anonymous");
          }
        });
      }
    }

    return rawMessages.map((m) => ({
      ...m,
      sender_name: senderNameCacheRef.current.get(m.sender_id) || "Anonymous",
    }));
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: student } = await supabase
        .from("students")
        .select("id, class_id")
        .eq("user_id", user.id)
        .single();

      if (!student?.class_id) {
        setStudentClassId(null);
        setRooms([]);
        setSelectedRoom(null);
        setIsLoading(false);
        return;
      }

      setStudentClassId(student.class_id);

      // Fetch rooms for student's class
      const { data: roomsData, error: roomsError } = await supabase
        .from("discussion_rooms")
        .select("*")
        .eq("class_id", student.class_id)
        .order("created_at", { ascending: true });

      if (roomsError) {
        toast.error("Failed to load discussion rooms");
        setRooms([]);
        setSelectedRoom(null);
      } else {
        setRooms(roomsData || []);
        setSelectedRoom((roomsData && roomsData.length > 0) ? roomsData[0] : null);
      }
      
      setIsLoading(false);
    };

    init();
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;

    setMessages([]);

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("discussion_messages")
        .select("*")
        .eq("room_id", selectedRoom.id)
        .order("created_at", { ascending: true });

      if (error) {
        toast.error("Failed to load messages");
        setMessages([]);
        return;
      }

      if (data) {
        const enriched = await enrichMessagesWithSenderNames(data as Message[]);
        setMessages(enriched);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`room-${selectedRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "discussion_messages",
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          const [enriched] = await enrichMessagesWithSenderNames([newMsg]);
          addMessageOnce(enriched);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoom]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  const clearChatForMe = () => {
    if (!selectedRoom) return;

    // Use the latest server timestamp we currently have, so new messages will still appear.
    const maxTs = messages.reduce<number>((max, m) => {
      const t = new Date(m.created_at).getTime();
      return Number.isFinite(t) ? Math.max(max, t) : max;
    }, 0);

    const clearedAfter = maxTs > 0 ? new Date(maxTs).toISOString() : new Date(0).toISOString();

    setClearedAfterByRoomId((prev) => {
      const next = { ...prev, [selectedRoom.id]: clearedAfter };
      persistClearedAfter(next);
      return next;
    });
    toast.success("Chat cleared");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !userId) return;

    setIsSending(true);

    const trimmed = newMessage.trim();
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      message_text: trimmed,
      sender_id: userId,
      created_at: new Date().toISOString(),
    };

    // Show the message immediately even if Realtime isn't enabled.
    addMessageOnce(optimisticMessage);
    setNewMessage("");

    const { data, error } = await supabase
      .from("discussion_messages")
      .insert({
        room_id: selectedRoom.id,
        sender_id: userId,
        message_text: trimmed,
      })
      .select("*")
      .single();

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setNewMessage(trimmed);
      toast.error("Failed to send message");
      setIsSending(false);
      return;
    }

    if (data) {
      const [enriched] = await enrichMessagesWithSenderNames([data as Message]);
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimisticId);
        return withoutOptimistic.some((m) => m.id === enriched.id)
          ? withoutOptimistic
          : [...withoutOptimistic, enriched];
      });
    } else {
      // If we can't get the inserted row back, keep optimistic.
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast.error("Message sent, but couldn't refresh messages");
    }

    setIsSending(false);
  };

  const createRoom = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!studentClassId) {
      toast.error("Join a class to access discussions");
      return;
    }

    const { data, error } = await supabase
      .from("discussion_rooms")
      .insert({
        name: `Study Room ${rooms.length + 1}`,
        class_id: studentClassId,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create room");
    } else if (data) {
      setRooms([...rooms, data]);
      setSelectedRoom(data);
      toast.success("Room created!");
    }
  };

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Discussion Rooms</h1>
          <p className="text-muted-foreground">
            Chat with classmates, teachers, and everyone in the class so the whole learning circle can stay aligned.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Rooms List */}
          <Card className="bg-card border-border lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="font-display text-lg">Rooms</CardTitle>
              <Button size="sm" onClick={createRoom} className="bg-primary hover:bg-primary/90" disabled={!studentClassId}>
                + New
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : !studentClassId ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Join a class to access discussions.
                </p>
              ) : rooms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No rooms yet</p>
              ) : (
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <Button
                      key={room.id}
                      variant={selectedRoom?.id === room.id ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedRoom(room)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {room.name}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="bg-card border-border lg:col-span-3 flex flex-col h-[600px]">
            {!selectedRoom ? (
              <CardContent className="flex-1 flex items-center justify-center">
                <EmptyState
                  title="Select a room"
                  message="Choose a discussion room or create a new one"
                  icon={Users}
                />
              </CardContent>
            ) : (
              <>
                <CardHeader className="border-b border-border pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      {selectedRoom.name}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearChatForMe}
                      className="gap-2"
                      title="Clear messages (only for you)"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                  <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {visibleMessages.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</p>
                      ) : (
                        visibleMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
                          >
                            {msg.sender_id !== userId && (
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                  {msg.sender_name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className={`max-w-[70%] ${msg.sender_id === userId ? "text-right" : ""}`}>
                              {msg.sender_id !== userId && (
                                <p className="text-xs text-muted-foreground mb-1">{msg.sender_name}</p>
                              )}
                              <div className={`rounded-2xl px-4 py-2 ${
                                msg.sender_id === userId
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              }`}>
                                <p className="text-sm">{msg.message_text}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            {msg.sender_id === userId && (
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-secondary/20 text-secondary text-xs">
                                  You
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-border flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-muted border-border"
                      disabled={isSending}
                    />
                    <Button type="submit" disabled={isSending || !newMessage.trim()} className="bg-primary hover:bg-primary/90">
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </form>
                </CardContent>
              </>
            )}
          </Card>

        </div>
      </div>
    </PortalLayout>
  );
}
