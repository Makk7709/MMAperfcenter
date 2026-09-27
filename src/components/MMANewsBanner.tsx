import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface FightResult {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

// RSS dates are free text: an unparsable one must drop the label, not throw
// (formatDistanceToNow throws on Invalid Date and would take the page down).
function relativeDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

export const MMANewsBanner = () => {
  const [results, setResults] = useState<FightResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const { data, error: functionError } = await supabase.functions.invoke('fetch-mma-results');
      
      if (functionError) throw functionError;
      
      if (Array.isArray(data?.results)) {
        setResults(
          (data.results as FightResult[]).filter(
            (r) => typeof r?.title === "string" && typeof r?.link === "string" && /^https?:\/\//.test(r.link),
          ),
        );
      }
    } catch (err) {
      console.error('Error fetching MMA results:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || results.length === 0) {
    return null;
  }

  // Duplicate results for seamless loop (clé stable préfixée par copie)
  const displayResults = [
    ...results.map((r) => ({ ...r, loopKey: `a-${r.link}` })),
    ...results.map((r) => ({ ...r, loopKey: `b-${r.link}` })),
  ];

  return (
    <div className="bg-card border-y border-border/50 overflow-hidden relative">
      {/* Gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-gold-accent opacity-50" />
      
      <div className="relative py-3">
        <div className="animate-scroll-left flex gap-8 whitespace-nowrap">
          {displayResults.map((result) => (
            <a
              key={result.loopKey}
              tabIndex={result.loopKey.startsWith("b-") ? -1 : undefined}
              aria-hidden={result.loopKey.startsWith("b-") ? true : undefined}
              href={result.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 group hover:text-primary transition-colors"
            >
              <span className="text-xs font-semibold text-primary px-2 py-1 rounded bg-primary/10 border border-primary/20">
                {result.source}
              </span>
              <span className="text-sm text-foreground/90 group-hover:text-primary">
                {result.title}
              </span>
              {relativeDate(result.pubDate) && (
                <span className="text-xs text-muted-foreground">{relativeDate(result.pubDate)}</span>
              )}
              <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
              <span className="text-border mx-4">•</span>
            </a>
          ))}
        </div>
      </div>
      
      {/* Gold accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-gold-accent opacity-50" />
    </div>
  );
};
