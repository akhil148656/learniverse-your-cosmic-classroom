import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

type Message = { role: "user" | "assistant"; content: string };

export type ChatAttachment =
  | {
      kind: "image";
      name: string;
      mime: string;
      dataUrl: string;
      size: number;
    }
  | {
      kind: "pdf";
      name: string;
      mime: "application/pdf";
      extractedText: string;
      size: number;
    };

type SendMessageOptions = {
  attachment?: ChatAttachment | null;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-mentor`;

export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(
    async (input: string, type: "chat" | "notes" | "quiz" = "chat", options: SendMessageOptions = {}) => {
    const attachment = options.attachment ?? null;

    const displaySuffix = attachment ? `\n\n(Attached: ${attachment.name})` : "";
    const userMsg: Message = { role: "user", content: input + displaySuffix };

    const prior = messagesRef.current;
    setMessages([...prior, userMsg]);
    setIsLoading(true);

    const apiUserContentParts: string[] = [input];
    if (attachment?.kind === "pdf") {
      const text = String(attachment.extractedText || "").trim();
      if (text) {
        apiUserContentParts.push(
          `\n\n[The student attached a PDF: ${attachment.name}. Extracted text below. Use it to answer the student's doubt.]\n\n"""\n${text}\n"""`
        );
      } else {
        apiUserContentParts.push(`\n\n[The student attached a PDF: ${attachment.name}. No text could be extracted.]`);
      }
    }
    if (attachment?.kind === "image") {
      apiUserContentParts.push(`\n\n[The student attached an image: ${attachment.name}. Use the image to answer.]`);
    }

    const apiMessages: Message[] = [...prior, { role: "user", content: apiUserContentParts.join("") }];

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages, type, attachment }),
      });

      console.log("AI response status:", resp.status);

      if (resp.status === 429) {
        const errorText = await resp.text().catch(() => "");
        let extracted = errorText;
        try {
          const parsed = JSON.parse(errorText);
          extracted = parsed?.error || parsed?.message || parsed?.details || errorText;
        } catch {
          // keep raw text
        }
        toast.error((extracted || "AI quota exceeded. Check billing/quota.").toString());
        setIsLoading(false);
        return null;
      }
      if (resp.status === 404) {
        const errorText = await resp.text().catch(() => "");
        let extracted = errorText;
        try {
          const parsed = JSON.parse(errorText);
          extracted = parsed?.error || parsed?.message || parsed?.details || errorText;
        } catch {
          // keep raw text
        }
        toast.error(
          (extracted || "AI model not found. Set GEMINI_MODEL=gemini-2.0-flash (or remove GEMINI_MODEL).").toString()
        );
        setIsLoading(false);
        return null;
      }
      if (resp.status === 402) {
        toast.error("Usage limit reached. Please add credits.");
        setIsLoading(false);
        return null;
      }

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => "");
        console.error("AI API error:", resp.status, errorText);
        let extracted = errorText;
        try {
          const parsed = JSON.parse(errorText);
          extracted = parsed?.error || parsed?.message || parsed?.details || errorText;
        } catch {
          // keep raw text
        }
        throw new Error((extracted || "Failed to get AI response").toString());
      }
      
      if (!resp.body) {
        throw new Error("No response body from AI");
      }

      if (type === "quiz") {
        const data = await resp.json();
        setIsLoading(false);
        return data;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setIsLoading(false);
      return assistantContent;
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to get AI response";

      if (/Gemini API error \(404\)|model not found|not found for API version/i.test(errorMessage)) {
        toast.error(
          "AI model not found. In Supabase Edge Function env vars, set GEMINI_MODEL=gemini-2.0-flash (or remove GEMINI_MODEL)."
        );
      } else {
        toast.error(
          /LOVABLE_API_KEY|GEMINI_API_KEY/i.test(errorMessage)
            ? "AI not configured. Add GROQ_API_KEY (Groq) or GEMINI_API_KEY (Google AI Studio) in Supabase Edge Function secrets."
            : errorMessage
        );
      }
      setIsLoading(false);
      return null;
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages, setMessages };
}
