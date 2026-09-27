import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseOffProduct, type FoodProduct } from "@/lib/nutrition";

interface FoodSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onFoodSelect: (food: FoodProduct) => void;
  placeholder?: string;
  id?: string;
}

// Open Food Facts allows 10 searches per minute and per IP (several users can
// share one IP on a gym Wi-Fi): searches are explicit (Enter or button),
// cached for the session and throttled below that limit.
const SEARCH_WINDOW_MS = 60_000;
const MAX_SEARCHES_PER_WINDOW = 8;
const searchCache = new Map<string, FoodProduct[]>();
const recentSearches: number[] = [];

type SearchStatus = { kind: "idle" } | { kind: "empty" } | { kind: "error"; message: string };

function waitBeforeNextSearch(now: number): number {
  while (recentSearches.length > 0 && now - recentSearches[0] > SEARCH_WINDOW_MS) recentSearches.shift();
  if (recentSearches.length < MAX_SEARCHES_PER_WINDOW) return 0;
  return SEARCH_WINDOW_MS - (now - recentSearches[0]);
}

export const FoodSearchInput = ({
  value,
  onChange,
  onFoodSelect,
  placeholder = "Rechercher un aliment…",
  id,
}: FoodSearchInputProps) => {
  const [results, setResults] = useState<FoodProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [status, setStatus] = useState<SearchStatus>({ kind: "idle" });
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      controllerRef.current?.abort();
    };
  }, []);

  const showFoods = (foods: FoodProduct[]) => {
    setResults(foods);
    setShowResults(foods.length > 0);
    setStatus(foods.length > 0 ? { kind: "idle" } : { kind: "empty" });
  };

  const search = async () => {
    const query = value.trim();
    if (query.length < 2) {
      setStatus({ kind: "error", message: "Saisissez au moins 2 lettres." });
      return;
    }
    const key = query.toLowerCase();
    const cached = searchCache.get(key);
    if (cached) {
      showFoods(cached);
      return;
    }
    const wait = waitBeforeNextSearch(Date.now());
    if (wait > 0) {
      setStatus({
        kind: "error",
        message: `Trop de recherches d'affilée : réessayez dans ${Math.ceil(wait / 1000)} s, ou saisissez l'aliment à la main.`,
      });
      return;
    }

    // A slower, older response must never overwrite newer results.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    recentSearches.push(Date.now());
    setIsSearching(true);
    setStatus({ kind: "idle" });
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,product_name_fr,brands,nutriments,serving_quantity`,
        { signal: controller.signal },
      );
      if (response.status === 429) {
        setStatus({
          kind: "error",
          message: "La base Open Food Facts est saturée : réessayez dans une minute, ou saisissez l'aliment à la main.",
        });
        return;
      }
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      const data = await response.json();

      const products: unknown[] = Array.isArray(data.products) ? data.products : [];
      const foods = products
        .filter((p) => !!(p as { product_name?: string })?.product_name)
        .map(parseOffProduct)
        .filter((f): f is FoodProduct => f !== null)
        .slice(0, 8);

      if (controller.signal.aborted) return;
      searchCache.set(key, foods);
      showFoods(foods);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("Food search error:", error);
      setResults([]);
      setStatus({ kind: "error", message: "Recherche impossible. Vérifiez votre connexion ou saisissez l'aliment à la main." });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setIsSearching(false);
      }
    }
  };

  const handleSelect = (food: FoodProduct) => {
    const label = food.brand ? `${food.name} (${food.brand})` : food.name;
    onFoodSelect(food);
    onChange(label);
    setShowResults(false);
    setStatus({ kind: "idle" });
  };

  const statusId = id ? `${id}-status` : undefined;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id={id}
            value={value}
            autoComplete="off"
            enterKeyHint="search"
            aria-describedby={statusId}
            onChange={(e) => {
              onChange(e.target.value);
              if (status.kind !== "idle") setStatus({ kind: "idle" });
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              // Inside a form, Enter would submit it instead of searching.
              e.preventDefault();
              void search();
            }}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void search()}
          disabled={isSearching}
          aria-label="Rechercher dans Open Food Facts"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Chercher"}
        </Button>
      </div>

      <p id={statusId} className="sr-only" aria-live="polite">
        {isSearching ? "Recherche en cours" : status.kind === "empty" ? "Aucun résultat" : status.kind === "error" ? status.message : ""}
      </p>
      {status.kind === "empty" && (
        <p className="mt-1 text-xs text-muted-foreground">Aucun aliment trouvé : essayez un autre mot ou saisissez-le à la main.</p>
      )}
      {status.kind === "error" && <p className="mt-1 text-xs text-destructive">{status.message}</p>}

      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto border border-border bg-popover shadow-lg">
          {results.map((food) => (
            <button
              key={`${food.name}-${food.brand ?? ""}-${food.per100.calories}`}
              type="button"
              onClick={() => handleSelect(food)}
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-accent transition-colors",
                "border-b border-border/50 last:border-b-0"
              )}
            >
              <p className="font-medium text-sm text-foreground truncate">
                {food.name}
                {food.brand && <span className="text-muted-foreground"> · {food.brand}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {food.per100.calories} kcal · P {food.per100.protein.toLocaleString("fr-FR")} g · G {food.per100.carbs.toLocaleString("fr-FR")} g · L {food.per100.fat.toLocaleString("fr-FR")} g
                <span className="text-muted-foreground/70"> pour 100 g</span>
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
