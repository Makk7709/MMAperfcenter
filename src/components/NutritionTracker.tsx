import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Settings, Flame, Camera } from "lucide-react";
import { useNutrition } from "@/hooks/useNutrition";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { FoodSearchInput } from "@/components/FoodSearchInput";
import type { NutritionLog } from "@/hooks/useNutrition";

export const NutritionTracker = () => {
  const { todayLogs, goals, loading, addNutritionLog, deleteNutritionLog, updateGoals, getTodayTotals } = useNutrition();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  
  // Form states
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  
  // Goals form states
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

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await addNutritionLog({
      date: new Date().toISOString().split('T')[0],
      meal_type: mealType,
      food_name: foodName,
      calories: Number(calories),
      protein_g: Number(protein),
      carbs_g: Number(carbs),
      fat_g: Number(fat),
    });
    
    // Reset form
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
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
                  <Input
                    type="number"
                    value={newCalories}
                    onChange={(e) => setNewCalories(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Protéines (g/jour)</Label>
                  <Input
                    type="number"
                    value={newProtein}
                    onChange={(e) => setNewProtein(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Glucides (g/jour)</Label>
                  <Input
                    type="number"
                    value={newCarbs}
                    onChange={(e) => setNewCarbs(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Lipides (g/jour)</Label>
                  <Input
                    type="number"
                    value={newFat}
                    onChange={(e) => setNewFat(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Sauvegarder
                </Button>
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
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(macros.calories.current / macros.calories.target) * 314} 314`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">
                {macros.calories.current}
              </span>
              <span className="text-xs text-muted-foreground">
                /{macros.calories.target} kcal
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {Math.max(0, macros.calories.target - macros.calories.current)} kcal restantes
          </p>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Protéines</div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-foreground">
                {macros.protein.current}<span className="text-xs text-muted-foreground">/{macros.protein.target}g</span>
              </div>
              <Progress 
                value={(macros.protein.current / macros.protein.target) * 100} 
                className="h-2"
              />
            </div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Glucides</div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-foreground">
                {macros.carbs.current}<span className="text-xs text-muted-foreground">/{macros.carbs.target}g</span>
              </div>
              <Progress 
                value={(macros.carbs.current / macros.carbs.target) * 100} 
                className="h-2"
              />
            </div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Lipides</div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-foreground">
                {macros.fat.current}<span className="text-xs text-muted-foreground">/{macros.fat.target}g</span>
              </div>
              <Progress 
                value={(macros.fat.current / macros.fat.target) * 100} 
                className="h-2"
              />
            </div>
          </div>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNutritionLog(log.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setScannerOpen(true)}
          >
            <Camera className="h-4 w-4 mr-2" />
            Scanner
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Manuel
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un Aliment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddFood} className="space-y-4">
              <div>
                <Label>Type de repas</Label>
                <Select value={mealType} onValueChange={(v) => setMealType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Petit-déjeuner</SelectItem>
                    <SelectItem value="lunch">Déjeuner</SelectItem>
                    <SelectItem value="dinner">Dîner</SelectItem>
                    <SelectItem value="snack">Collation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nom de l'aliment</Label>
                <FoodSearchInput
                  value={foodName}
                  onChange={setFoodName}
                  onFoodSelect={(food) => {
                    setCalories(food.calories.toString());
                    setProtein(food.protein.toString());
                    setCarbs(food.carbs.toString());
                    setFat(food.fat.toString());
                  }}
                  placeholder="Rechercher un aliment..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tapez pour rechercher ou saisissez manuellement
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Calories</Label>
                  <Input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="250"
                    required
                  />
                </div>
                <div>
                  <Label>Protéines (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="30"
                    required
                  />
                </div>
                <div>
                  <Label>Glucides (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="15"
                    required
                  />
                </div>
                <div>
                  <Label>Lipides (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder="5"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Ajouter
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
        
        <BarcodeScannerDialog 
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onFoodScanned={handleFoodScanned}
        />
      </CardContent>
    </Card>
  );
};
