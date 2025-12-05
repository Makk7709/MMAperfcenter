import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Sparkles, RefreshCw, Target, TrendingUp, Utensils, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AIStatsAnalysis() {
  const [analysis, setAnalysis] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const generateAnalysis = async () => {
    setIsLoading(true);
    setAnalysis("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vous devez être connecté");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-stats-analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Limite atteinte, réessayez dans quelques instants");
          return;
        }
        if (response.status === 402) {
          toast.error("Crédit insuffisant");
          return;
        }
        throw new Error("Erreur lors de l'analyse");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let textBuffer = "";
      let analysisText = "";

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
              analysisText += content;
              setAnalysis(analysisText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setHasAnalyzed(true);
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Erreur lors de l'analyse IA");
    } finally {
      setIsLoading(false);
    }
  };

  const renderAnalysis = (text: string) => {
    const sections = text.split(/(?=## )/);
    
    return sections.map((section, index) => {
      if (!section.trim()) return null;
      
      const lines = section.split("\n");
      const title = lines[0]?.replace("## ", "").trim();
      const content = lines.slice(1).join("\n").trim();
      
      let icon = <Sparkles className="h-5 w-5" />;
      let iconColor = "text-primary";
      
      if (title?.includes("Synthèse") || title?.includes("Performance")) {
        icon = <Target className="h-5 w-5" />;
        iconColor = "text-primary";
      } else if (title?.includes("Entraînement")) {
        icon = <TrendingUp className="h-5 w-5" />;
        iconColor = "text-secondary";
      } else if (title?.includes("Nutrition")) {
        icon = <Utensils className="h-5 w-5" />;
        iconColor = "text-accent";
      } else if (title?.includes("Action") || title?.includes("Plan")) {
        icon = <Rocket className="h-5 w-5" />;
        iconColor = "text-primary";
      }
      
      return (
        <div key={index} className="mb-6 last:mb-0">
          {title && (
            <div className={`flex items-center gap-2 mb-3 ${iconColor}`}>
              {icon}
              <h3 className="text-lg font-semibold text-foreground">{title.replace(/[🎯💪🍽️📈]/g, "").trim()}</h3>
            </div>
          )}
          <div className="text-muted-foreground space-y-2 pl-7">
            {content.split("\n").map((line, lineIndex) => {
              if (!line.trim()) return null;
              
              const formattedLine = line
                .replace(/^\s*-\s*/, "• ")
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>');
              
              return (
                <p 
                  key={lineIndex} 
                  className="leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formattedLine }}
                />
              );
            })}
          </div>
        </div>
      );
    });
  };

  return (
    <Card className="bg-gradient-card border-0 shadow-card overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <span className="text-xl">Analyse IA Personnalisée</span>
              <p className="text-sm font-normal text-muted-foreground mt-1">
                Synthèse intelligente de ta progression
              </p>
            </div>
          </div>
          <Button 
            onClick={generateAnalysis} 
            disabled={isLoading}
            variant="hero"
            size="sm"
            className="gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyse...
              </>
            ) : hasAnalyzed ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyser
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {!analysis && !isLoading && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Obtiens ton analyse personnalisée</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Coach IA KOREV analyse tes données d'entraînement et de nutrition pour te donner des recommandations adaptées à tes objectifs.
            </p>
            <Button onClick={generateAnalysis} variant="hero" size="lg" className="gap-2">
              <Sparkles className="h-5 w-5" />
              Lancer l'analyse IA
            </Button>
          </div>
        )}
        
        {isLoading && !analysis && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground">Analyse de tes données en cours...</p>
          </div>
        )}
        
        {analysis && (
          <ScrollArea className="h-[500px]">
            <div className="p-6">
              {renderAnalysis(analysis)}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
