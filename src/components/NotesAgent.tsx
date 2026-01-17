import { useState, useEffect } from "react";
import { Trash2, Plus, Pin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type NoteRow = Database["public"]["Tables"]["notes"]["Row"];

interface NotesAgentProps {
  title?: string;
  subtitle?: string;
  noteType?: "personal" | "class" | "student" | "assignment";
  relatedId?: string;
}

export default function NotesAgent({
  title = "Quick Notes",
  subtitle = "For you to help remember",
  noteType = "personal",
  relatedId,
}: NotesAgentProps) {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", content: "", color: "#6366f1" });

  const colors = [
    "#6366f1", // indigo
    "#f43f5e", // rose
    "#ec4899", // pink
    "#f59e0b", // amber
    "#10b981", // emerald
    "#3b82f6", // blue
  ];

  const fetchNotes = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    let query = supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .eq("note_type", noteType);

    if (relatedId) {
      query = query.eq("related_id", relatedId);
    }

    const { data, error } = await query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`Failed to load notes: ${error.message}`);
      setNotes([]);
      setIsLoading(false);
      return;
    }

    if (data) setNotes(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, [noteType, relatedId]);

  const addNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      toast.error("Please enter title and content");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to save notes");
      return;
    }

    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      note_type: noteType,
      title: newNote.title,
      content: newNote.content,
      color: newNote.color,
      related_id: relatedId || null,
    });

    if (error) {
      toast.error(`Failed to save note: ${error.message}`);
      return;
    }

    toast.success("Note saved!");
    setNewNote({ title: "", content: "", color: "#6366f1" });
    setShowForm(false);
    fetchNotes();
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      toast.error(`Failed to delete note: ${error.message}`);
      return;
    }
    setNotes(notes.filter((n) => n.id !== id));
    toast.success("Note deleted");
  };

  const togglePin = async (id: string, isPinned: boolean) => {
    const { error } = await supabase
      .from("notes")
      .update({ is_pinned: !isPinned })
      .eq("id", id);

    if (error) {
      toast.error(`Failed to update note: ${error.message}`);
      return;
    }
    fetchNotes();
  };

  return (
    <Card className="bg-gradient-to-br from-card via-card/50 to-card border-border">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-display text-lg text-foreground">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
            <Input
              placeholder="Note title..."
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              className="bg-input border-border"
            />
            <Textarea
              placeholder="Write your note here..."
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              className="bg-input border-border min-h-[100px]"
            />
            <div className="flex gap-2">
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewNote({ ...newNote, color })}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      newNote.color === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={addNote}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                Save Note
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No notes yet. Start by adding one!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors relative group"
                style={{
                  backgroundColor: `${note.color ?? "#6366f1"}15`,
                  borderLeftColor: note.color ?? "#6366f1",
                  borderLeftWidth: "4px",
                }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm break-words">{note.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => togglePin(note.id, !!note.is_pinned)}
                    >
                      <Pin className={`w-3 h-3 ${note.is_pinned ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:text-destructive"
                      onClick={() => deleteNote(note.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
