import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Trophy, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface FightResult {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  imageUrl?: string;
}

export const MMAResultsFeed = () => {
  const [results, setResults] = useState<FightResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: functionError } = await supabase.functions.invoke('fetch-mma-results');
      
      if (functionError) throw functionError;
      
      if (data?.results) {
        setResults(data.results);
      }
    } catch (err) {
      console.error('Error fetching MMA results:', err);
      setError('Impossible de charger les résultats');
    } finally {
      setLoading(false);
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Sherdog':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'MMA Fighting':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Bloody Elbow':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  if (loading) {
    return (
      <Card className="liquid-glass-solid border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Résultats MMA Live
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {["s1", "s2", "s3", "s4", "s5"].map((id) => (
            <div key={id} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="liquid-glass-solid border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Résultats MMA Live
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="liquid-glass-solid border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Résultats MMA Live
          <Badge variant="outline" className="ml-auto text-xs">
            {results.length} résultats
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {results.map((result) => (
              <a
                key={result.link}
                href={result.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="relative p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-sm">
                  {/* Gold accent on hover */}
                  <div className="absolute inset-0 bg-gradient-gold-accent opacity-0 group-hover:opacity-10 rounded-lg transition-opacity" />
                  
                  <div className="relative space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                        {result.title}
                      </h3>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                    </div>
                    
                    {result.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {result.description.replace(/<[^>]*>/g, '')}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-2 py-0.5 ${getSourceColor(result.source)}`}
                      >
                        {result.source}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(result.pubDate), { 
                          addSuffix: true,
                          locale: fr 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
