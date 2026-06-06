import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoodResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  brand?: string;
}

interface OpenFoodFactsSearchProduct {
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, number>;
}

interface FoodSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onFoodSelect: (food: FoodResult) => void;
  placeholder?: string;
}

export const FoodSearchInput = ({
  value,
  onChange,
  onFoodSelect,
  placeholder = "Rechercher un aliment..."
}: FoodSearchInputProps) => {
  const [results, setResults] = useState<FoodResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

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

    if (value.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(value)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,brands,nutriments`
        );
        
        if (!response.ok) throw new Error("Search failed");
        
        const data = await response.json();
        
        const products: OpenFoodFactsSearchProduct[] = data.products || [];
        const foods: FoodResult[] = products
          .filter((p) => p.product_name && p.nutriments)
          .map((product) => {
            const n = product.nutriments ?? {};
            return {
              name: product.product_name as string,
              brand: product.brands,
              calories: Math.round(n["energy-kcal_100g"] || n["energy-kcal"] || 0),
              protein: Math.round((n.proteins_100g || n.proteins || 0) * 10) / 10,
              carbs: Math.round((n.carbohydrates_100g || n.carbohydrates || 0) * 10) / 10,
              fat: Math.round((n.fat_100g || n.fat || 0) * 10) / 10,
            };
          })
          .filter((f: FoodResult) => f.calories > 0 || f.protein > 0 || f.carbs > 0 || f.fat > 0);
        
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

  const handleSelect = (food: FoodResult) => {
    onFoodSelect(food);
    onChange(food.brand ? `${food.name} (${food.brand})` : food.name);
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
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((food) => (
            <button
              key={`${food.name}-${food.brand ?? ""}-${food.calories}`}
              type="button"
              onClick={() => handleSelect(food)}
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-accent transition-colors",
                "border-b border-border/50 last:border-b-0"
              )}
            >
              <p className="font-medium text-sm text-foreground truncate">
                {food.name}
                {food.brand && <span className="text-muted-foreground"> - {food.brand}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {food.calories} kcal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                <span className="text-muted-foreground/70"> (pour 100g)</span>
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
