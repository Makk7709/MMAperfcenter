import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { StartWorkoutDialog } from "@/components/StartWorkoutDialog";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { useState, useRef, useEffect } from "react";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useNutrition } from "@/hooks/useNutrition";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Camera, 
  ScanLine, 
  Dumbbell, 
  Brain, 
  Users, 
  Calendar,
  Plus,
  Play,
  Zap,
  BookOpen
} from "lucide-react";

interface QuickActionsProps {
  onSwitchTab?: (tab: string) => void;
}

type Message = { role: "user" | "assistant"; content: string };

export const QuickActions = ({ onSwitchTab }: QuickActionsProps) => {
  const [startWorkoutOpen, setStartWorkoutOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { startWorkout } = useWorkouts();
  const { addNutritionLog } = useNutrition();
  const navigate = useNavigate();
  
  // AI Coach state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const actions = [
    {
      title: "Scanner",
      description: "Nutrition",
      icon: ScanLine,
      variant: "default" as const,
      onClick: () => {
        setScannerOpen(true);
      }
    },
    {
      title: "Vidéos",
      description: "Entraînements",
      icon: Camera,
      variant: "fitness" as const,
      onClick: () => navigate("/training-videos")
    },
    {
      title: "Workout",
      description: "Démarrer",
      icon: Dumbbell,
      variant: "default" as const,
      onClick: () => {
        setStartWorkoutOpen(true);
      }
    },
    {
      title: "Combat",
      description: "Techniques",
      icon: Users,
      variant: "secondary" as const,
      onClick: () => {
        onSwitchTab?.("combat");
        toast.success("Technique MMA", { description: "Section combat activée" });
      }
    },
    {
      title: "Carnet",
      description: "Notes",
      icon: BookOpen,
      variant: "outline" as const,
      onClick: () => navigate("/journal")
    },
    {
      title: "Historique",
      description: "Séances",
      icon: Calendar,
      variant: "ghost" as const,
      onClick: () => navigate("/history")
    }
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;
      const { data: { session } } = await supabase.auth.getSession();
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error("Trop de requêtes, veuillez patienter quelques instants.");
        } else if (resp.status === 402) {
          toast.error("Crédit insuffisant, contactez le support.");
        } else {
          toast.error("Erreur de connexion au Coach IA");
        }
        setMessages(prev => prev.slice(0, -1));
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
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
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch { /* ignore */ }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de la communication avec le Coach IA");
      setMessages(prev => prev.slice(0, -1));
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-0 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Actions Rapides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant}
                className="h-24 flex-col gap-1.5 p-3 group justify-center"
                onClick={action.onClick}
              >
                <Icon className="h-6 w-6 group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
                <div className="text-center space-y-0.5">
                  <p className="text-xs font-bold leading-tight">{action.title}</p>
                  <p className="text-[10px] opacity-80 font-medium leading-tight">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
        
        {/* Coach IA Chat Zone */}
        <div className="mt-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-xl overflow-hidden shadow-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg leading-tight">Coach IA KOREV</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white/90 text-sm font-medium">En ligne • Personnalisé</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="h-[300px] p-5" ref={scrollRef}>
            <div className="space-y-4">
              {/* Initial Message */}
              {messages.length === 0 && (
                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-primary/10">
                  <p className="text-sm leading-relaxed mb-3">
                    Salut champion ! 👊 Je connais ton profil et je vais personnaliser mes conseils selon :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                      📋 Ton niveau & discipline
                    </span>
                    <span className="px-3 py-1.5 bg-secondary/10 text-secondary-foreground rounded-full text-xs font-semibold border border-secondary/20">
                      🥗 Tes objectifs
                    </span>
                    <span className="px-3 py-1.5 bg-accent/10 text-accent-foreground rounded-full text-xs font-semibold border border-accent/20">
                      🥊 Ton physique
                    </span>
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-4 shadow-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ml-8"
                      : "bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-primary/10 mr-8"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-primary/10 mr-8">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-primary/10 bg-background/50">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Pose ta question au coach..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-xl bg-background border border-primary/20 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm placeholder:text-muted-foreground disabled:opacity-50"
              />
              <Button 
                size="icon"
                className="h-12 w-12 rounded-xl shadow-md hover:shadow-lg transition-all"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
              >
                <Play className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      
      <StartWorkoutDialog 
        open={startWorkoutOpen} 
        onOpenChange={setStartWorkoutOpen}
        onStartWorkout={(name) => {
          startWorkout(name);
          onSwitchTab?.("workout");
        }}
      />

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onFoodScanned={(food) => {
          addNutritionLog(food);
          onSwitchTab?.("nutrition");
        }}
      />
    </Card>
  );
};