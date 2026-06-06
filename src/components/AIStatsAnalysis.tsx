import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Sparkles, RefreshCw, Target, TrendingUp, Utensils, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { consumeSSEStream } from "@/lib/sse";

const ANALYSIS_ERROR_MESSAGE = "Erreur lors de l'analyse IA";

// Ouvre le flux SSE de l'analyse de stats et renvoie un reader.
// Les erreurs connues remontent un message utilisateur explicite.
const openAnalysisStream = async (
  accessToken: string,
): Promise<ReadableStreamDefaultReader<Uint8Array>> => {
  let response: Response;
  try {
    response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-stats-analysis`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      }
    );
  } catch {
    throw new Error(ANALYSIS_ERROR_MESSAGE);
  }

  if (response.status === 429) throw new Error("Limite atteinte, réessayez dans quelques instants");
  if (response.status === 402) throw new Error("Crédit insuffisant");
  if (!response.ok) throw new Error(ANALYSIS_ERROR_MESSAGE);

  const reader = response.body?.getReader();
  if (!reader) throw new Error(ANALYSIS_ERROR_MESSAGE);
  return reader;
};

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

      const reader = await openAnalysisStream(session.access_token);

      let analysisText = "";
      await consumeSSEStream(reader, (delta) => {
        analysisText += delta;
        setAnalysis(analysisText);
      });

      setHasAnalyzed(true);
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error instanceof Error ? error.message : ANALYSIS_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAnalysis = (text: string) => {
    const sections = text.split(/(?=## )/);
    
    return sections.map((section) => {
      if (!section.trim()) return null;
      
      const lines = section.split("\n");
      const title = lines[0]?.replace("## ", "").trim();
      const content = lines.slice(1).join("\n").trim();
      
      let icon = <Sparkles className="h-5 w-5" />;
      let iconColor = "text-primary";
      
      if (title?.includes("Synthèse") || title?.includes("Performance")) {
        icon = <Target className="h-5 w-5" />;
      } else if (title?.includes("Entraînement")) {
        icon = <TrendingUp className="h-5 w-5" />;
        iconColor = "text-secondary";
      } else if (title?.includes("Nutrition")) {
        icon = <Utensils className="h-5 w-5" />;
        iconColor = "text-accent";
      } else if (title?.includes("Action") || title?.includes("Plan")) {
        icon = <Rocket className="h-5 w-5" />;
      }
      
      return (
        <div key={section} className="mb-6 last:mb-0">
          {title && (
            <div className={`flex items-center gap-2 mb-3 ${iconColor}`}>
              {icon}
              <h3 className="text-lg font-semibold text-foreground">{title.replace(/🎯|💪|🍽️|📈/gu, "").trim()}</h3>
            </div>
          )}
          <div className="text-muted-foreground space-y-2 pl-7">
            {content.split("\n").map((line) => {
              if (!line.trim()) return null;
              
              const formattedLine = line
                .replace(/^\s*-\s*/, "• ")
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>');
              
              return (
                <p 
                  key={line} 
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

  const renderButtonLabel = () => {
    if (isLoading) {
      return (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          Analyse...
        </>
      );
    }
    if (hasAnalyzed) {
      return (
        <>
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </>
      );
    }
    return (
      <>
        <Sparkles className="h-4 w-4" />
        Analyser
      </>
    );
  };

  return (
    <Card className="liquid-glass-solid border-0 overflow-hidden">
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
            {renderButtonLabel()}
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
