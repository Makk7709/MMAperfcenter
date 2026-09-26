import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseOffProduct, type FoodProduct } from "@/lib/nutrition";

interface FoodSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onFoodSelect: (food: FoodProduct) => void;
  placeholder?: string;
}

export const FoodSearchInput = ({
  value,
  onChange,
  onFoodSelect,
  placeholder = "Rechercher un aliment..."
}: FoodSearchInputProps) => {
  const [results, setResults] = useState<FoodProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedValueRef = useRef<string | null>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search Open Food Facts
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value === selectedValueRef.current) return;
    selectedValueRef.current = null;

    if (value.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(value)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,product_name_fr,brands,nutriments,serving_quantity`
        );
        
        if (!response.ok) throw new Error("Search failed");
        
        const data = await response.json();
        
        const products: unknown[] = Array.isArray(data.products) ? data.products : [];
        const foods = products
          .filter((p) => !!(p as { product_name?: string })?.product_name)
          .map(parseOffProduct)
          .filter((f): f is FoodProduct => f !== null)
          .slice(0, 8);
        
        setResults(foods);
        setShowResults(foods.length > 0);
      } catch (error) {
        console.error("Food search error:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleSelect = (food: FoodProduct) => {
    const label = food.brand ? `${food.name} (${food.brand})` : food.name;
    selectedValueRef.current = label;
    onFoodSelect(food);
    onChange(label);
    setShowResults(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>
      
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
