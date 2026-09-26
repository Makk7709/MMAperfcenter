import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { Bot, Send, Loader2, User, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { consumeSSEStream } from "@/lib/sse";
import { PDFExportButton } from "./PDFExportButton";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { FeaturePaywall } from "./FeaturePaywall";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let messageCounter = 0;
const nextMessageId = () => `msg-${++messageCounter}`;

// Mirrors the ai-coach limits: past answers are shortened, empty ones dropped.
const HISTORY_LIMIT = 30;
const ASSISTANT_CHARS_LIMIT = 6000;

const toPayload = (conversation: Message[]) =>
  conversation
    .filter((m) => m.content.trim())
    .slice(-HISTORY_LIMIT)
    .map(({ role, content }) => ({
      role,
      content: role === "assistant" ? content.slice(0, ASSISTANT_CHARS_LIMIT) : content,
    }));

// Ouvre le flux SSE du Coach IA. On utilise un fetch brut (et non
// supabase.functions.invoke) car la fonction streame des Server-Sent Events.
const openCoachStream = async (
  accessToken: string,
  payload: Array<Pick<Message, "role" | "content">>,
): Promise<ReadableStreamDefaultReader<Uint8Array>> => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-coach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages: payload, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || "Erreur de communication avec le Coach IA");
  }
  if (!response.body) {
    throw new Error("Pas de réponse du serveur");
  }

  return response.body.getReader();
};

export const AICoachChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const { gate, paywallOpen, setPaywallOpen } = useFeatureGate('ai_coach');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const setMessageContent = (id: string, content: string) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, content } : m)));
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sendingRef.current) return;
    // Pris avant le contrôle d'accès : un double clic ne consomme pas deux crédits.
    sendingRef.current = true;
    setIsLoading(true);

    const userMessage: Message = { id: nextMessageId(), role: "user", content: text };
    const assistantId = nextMessageId();
    let assistantContent = "";

    // Retire la question sans réponse et la remet dans le champ de saisie.
    const restoreQuestion = () => {
      setMessages(prev => prev.filter(m => m.id !== userMessage.id && m.id !== assistantId));
      setInput(current => current.trim() ? current : text);
    };

    try {
      // Vérifie l'accès (free = 3/mois, décompté côté serveur)
      const allowed = await gate();
      if (!allowed) return;

      const conversation = [...messages, userMessage];
      setMessages(conversation);
      setInput("");

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        toast.error(sessionError ? "Erreur de session" : "Veuillez vous reconnecter");
        restoreQuestion();
        return;
      }

      const reader = await openCoachStream(session.access_token, toPayload(conversation));
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      await consumeSSEStream(reader, (delta) => {
        assistantContent += delta;
        setMessageContent(assistantId, assistantContent);
      });

      if (!assistantContent.trim()) {
        toast.error("Le Coach IA n'a pas pu répondre à cette question. Reformulez-la puis réessayez.");
        restoreQuestion();
      }
    } catch (error) {
      console.error("Error:", error);
      if (assistantContent.trim()) {
        toast.error("La réponse du Coach IA a été interrompue.");
      } else {
        toast.error(error instanceof Error ? error.message : "Erreur de communication");
        restoreQuestion();
      }
    } finally {
      sendingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    "Crée-moi un programme de boxe pour débutant",
    "Calcule mes macros pour une sèche",
    "Propose-moi une recette protéinée",
  ];

  return (
    <>
    <Card className={cn(
      "transition-all duration-300",
      isExpanded ? "fixed inset-4 z-50" : "h-[500px]"
    )}>
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-primary rounded-lg">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Coach IA
              <Sparkles className="h-4 w-4 text-primary" />
            </CardTitle>
            <p className="text-xs text-muted-foreground">Votre assistant personnel MMA</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </CardHeader>

      <CardContent className={cn(
        "p-0 flex flex-col",
        isExpanded ? "h-[calc(100%-80px)]" : "h-[calc(100%-80px)]"
      )}>
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">
                Bonjour ! Je suis votre Coach IA personnalisé. Comment puis-je vous aider ?
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setInput(prompt);
                    }}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" && "flex-row-reverse"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                    msg.role === "user" ? "bg-primary" : "bg-muted"
                  )}>
                    {msg.role === "user" ? (
                      <User className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 max-w-[80%]">
                    <div className={cn(
                      "rounded-xl px-4 py-2",
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.role === "assistant" && msg.content === "" && isLoading && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                    {/* Show PDF export button for assistant messages with substantial content */}
                    {msg.role === "assistant" && msg.content.length > 100 && !isLoading && (
                      <div className="mt-2 flex justify-start">
                        <PDFExportButton content={msg.content} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question au Coach IA..."
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!input.trim() || isLoading}
              className="px-3"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    <FeaturePaywall feature="ai_coach" open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
};

