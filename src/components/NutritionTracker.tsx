import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Settings, Flame, Camera, Beef, Wheat, Droplet, Sparkles } from "lucide-react";
import { useNutrition } from "@/hooks/useNutrition";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { FoodSearchInput } from "@/components/FoodSearchInput";
import { cn } from "@/lib/utils";
import type { NutritionLog } from "@/hooks/useNutrition";

const QUICK_PORTIONS = [
  { label: "30 g", grams: 30 },
  { label: "50 g", grams: 50 },
  { label: "100 g", grams: 100 },
  { label: "150 g", grams: 150 },
  { label: "200 g", grams: 200 },
  { label: "250 g", grams: 250 },
];

export const NutritionTracker = () => {
  const { todayLogs, goals, loading, addNutritionLog, deleteNutritionLog, updateGoals, getTodayTotals } = useNutrition();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Form states
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [foodName, setFoodName] = useState('');
  // Base macros per 100g (from API or manual)
  const [base, setBase] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [hasBase, setHasBase] = useState(false);
  const [quantity, setQuantity] = useState<number>(100); // grams
  const [manualMode, setManualMode] = useState(false);

  // Goals form
  const [newCalories, setNewCalories] = useState(goals.daily_calories.toString());
  const [newProtein, setNewProtein] = useState(goals.daily_protein_g.toString());
  const [newCarbs, setNewCarbs] = useState(goals.daily_carbs_g.toString());
  const [newFat, setNewFat] = useState(goals.daily_fat_g.toString());

  const totals = getTodayTotals();

  const macros = {
    calories: { current: totals.calories, target: goals.daily_calories, unit: "kcal" },
    protein: { current: Math.round(totals.protein), target: goals.daily_protein_g, unit: "g" },
    carbs: { current: Math.round(totals.carbs), target: goals.daily_carbs_g, unit: "g" },
    fat: { current: Math.round(totals.fat), target: goals.daily_fat_g, unit: "g" }
  };

  // Computed macros for the entered quantity
  const computed = useMemo(() => {
    const ratio = quantity / 100;
    return {
      calories: Math.round(base.calories * ratio),
      protein: Math.round(base.protein * ratio * 10) / 10,
      carbs: Math.round(base.carbs * ratio * 10) / 10,
      fat: Math.round(base.fat * ratio * 10) / 10,
    };
  }, [base, quantity]);

  const resetForm = () => {
    setFoodName('');
    setBase({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    setHasBase(false);
    setQuantity(100);
    setManualMode(false);
  };

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName || computed.calories <= 0) return;

    await addNutritionLog({
      date: new Date().toISOString().split('T')[0],
      meal_type: mealType,
      food_name: quantity !== 100 ? `${foodName} (${quantity}g)` : foodName,
      calories: computed.calories,
      protein_g: computed.protein,
      carbs_g: computed.carbs,
      fat_g: computed.fat,
    });

    resetForm();
    setAddDialogOpen(false);
  };

  const handleUpdateGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateGoals({
      daily_calories: Number(newCalories),
      daily_protein_g: Number(newProtein),
      daily_carbs_g: Number(newCarbs),
      daily_fat_g: Number(newFat),
    });
    setGoalsDialogOpen(false);
  };

  const handleFoodScanned = async (food: Omit<NutritionLog, 'id'>) => {
    await addNutritionLog(food);
  };

  return (
    <Card className="bg-gradient-card border-0 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            Nutrition Aujourd'hui
          </CardTitle>
          <Dialog open={goalsDialogOpen} onOpenChange={setGoalsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Objectifs Nutritionnels</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateGoals} className="space-y-4">
                <div>
                  <Label>Calories (kcal/jour)</Label>
                  <Input type="number" value={newCalories} onChange={(e) => setNewCalories(e.target.value)} required />
                </div>
                <div>
                  <Label>Protéines (g/jour)</Label>
                  <Input type="number" value={newProtein} onChange={(e) => setNewProtein(e.target.value)} required />
                </div>
                <div>
                  <Label>Glucides (g/jour)</Label>
                  <Input type="number" value={newCarbs} onChange={(e) => setNewCarbs(e.target.value)} required />
                </div>
                <div>
                  <Label>Lipides (g/jour)</Label>
                  <Input type="number" value={newFat} onChange={(e) => setNewFat(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>Sauvegarder</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calories principales */}
        <div className="text-center space-y-2 pb-4 border-b">
          <div className="relative inline-flex items-center justify-center w-28 h-28">
            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
              <circle cx="60" cy="60" r="50" stroke="hsl(var(--primary))" strokeWidth="8" fill="none"
                strokeDasharray={`${(macros.calories.current / macros.calories.target) * 314} 314`}
                className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{macros.calories.current}</span>
              <span className="text-xs text-muted-foreground">/{macros.calories.target} kcal</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {Math.max(0, macros.calories.target - macros.calories.current)} kcal restantes
          </p>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3">
          {(['protein', 'carbs', 'fat'] as const).map((k) => {
            const labels = { protein: 'Protéines', carbs: 'Glucides', fat: 'Lipides' };
            return (
              <div key={k} className="text-center space-y-2">
                <div className="text-xs font-medium text-muted-foreground">{labels[k]}</div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-foreground">
                    {macros[k].current}<span className="text-xs text-muted-foreground">/{macros[k].target}g</span>
                  </div>
                  <Progress value={(macros[k].current / macros[k].target) * 100} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Today's logs */}
        {todayLogs.length > 0 && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium">Repas du jour</p>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {todayLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm p-2 bg-secondary/10 rounded">
                  <div className="flex-1">
                    <p className="font-medium">{log.food_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.calories} kcal • P: {log.protein_g}g • C: {log.carbs_g}g • F: {log.fat_g}g
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteNutritionLog(log.id)} disabled={loading}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="w-full" onClick={() => setScannerOpen(true)}>
            <Camera className="h-4 w-4 mr-2" />
            Scanner
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={(o) => { setAddDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Ajouter un aliment
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddFood} className="space-y-5">
                {/* Repas */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Repas</Label>
                  <Select value={mealType} onValueChange={(v) => setMealType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">🌅 Petit-déjeuner</SelectItem>
                      <SelectItem value="lunch">☀️ Déjeuner</SelectItem>
                      <SelectItem value="dinner">🌙 Dîner</SelectItem>
                      <SelectItem value="snack">🍎 Collation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Recherche */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Aliment</Label>
                  <FoodSearchInput
                    value={foodName}
                    onChange={(v) => { setFoodName(v); if (!v) setHasBase(false); }}
                    onFoodSelect={(food) => {
                      setBase({ calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat });
                      setHasBase(true);
                      setManualMode(false);
                      setQuantity(100);
                    }}
                    placeholder="Ex: poulet, riz, banane..."
                  />
                  {!hasBase && !manualMode && (
                    <button
                      type="button"
                      onClick={() => { setManualMode(true); setHasBase(true); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Saisir les valeurs nutritionnelles manuellement
                    </button>
                  )}
                </div>

                {/* Valeurs pour 100g (manuel ou édition) */}
                {hasBase && (
                  <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Valeurs pour 100 g
                      </Label>
                      {!manualMode && (
                        <Badge variant="secondary" className="text-[10px]">Open Food Facts</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Kcal</Label>
                        <Input type="number" value={base.calories || ''} onChange={(e) => setBase({ ...base, calories: Number(e.target.value) })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Prot.</Label>
                        <Input type="number" step="0.1" value={base.protein || ''} onChange={(e) => setBase({ ...base, protein: Number(e.target.value) })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Gluc.</Label>
                        <Input type="number" step="0.1" value={base.carbs || ''} onChange={(e) => setBase({ ...base, carbs: Number(e.target.value) })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Lip.</Label>
                        <Input type="number" step="0.1" value={base.fat || ''} onChange={(e) => setBase({ ...base, fat: Number(e.target.value) })} className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Quantité */}
                {hasBase && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Quantité</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 0))}
                          className="h-8 w-20 text-right text-sm"
                        />
                        <span className="text-sm text-muted-foreground">g</span>
                      </div>
                    </div>
                    <Slider
                      value={[Math.min(quantity, 500)]}
                      onValueChange={([v]) => setQuantity(v)}
                      min={10}
                      max={500}
                      step={5}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_PORTIONS.map((p) => (
                        <button
                          key={p.grams}
                          type="button"
                          onClick={() => setQuantity(p.grams)}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-full border transition-colors",
                            quantity === p.grams
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:bg-muted"
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aperçu live */}
                {hasBase && (
                  <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Total pour {quantity}g</span>
                      <div className="flex items-baseline gap-1">
                        <Flame className="h-4 w-4 text-primary self-center" />
                        <span className="text-2xl font-bold text-foreground">{computed.calories}</span>
                        <span className="text-xs text-muted-foreground">kcal</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-background/60 p-2">
                        <Beef className="h-3.5 w-3.5 mx-auto text-red-500 mb-0.5" />
                        <div className="text-sm font-bold">{computed.protein}g</div>
                        <div className="text-[10px] text-muted-foreground">Protéines</div>
                      </div>
                      <div className="rounded-lg bg-background/60 p-2">
                        <Wheat className="h-3.5 w-3.5 mx-auto text-amber-500 mb-0.5" />
                        <div className="text-sm font-bold">{computed.carbs}g</div>
                        <div className="text-[10px] text-muted-foreground">Glucides</div>
                      </div>
                      <div className="rounded-lg bg-background/60 p-2">
                        <Droplet className="h-3.5 w-3.5 mx-auto text-blue-500 mb-0.5" />
                        <div className="text-sm font-bold">{computed.fat}g</div>
                        <div className="text-[10px] text-muted-foreground">Lipides</div>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading || !foodName || !hasBase || computed.calories <= 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter au journal
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <BarcodeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onFoodScanned={handleFoodScanned} />
      </CardContent>
    </Card>
  );
};
