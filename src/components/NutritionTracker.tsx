import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Apple, 
  ScanLine, 
  Plus, 
  Target,
  Flame,
  Droplets,
  Scale
} from "lucide-react";

export const NutritionTracker = () => {
  const nutritionData = {
    calories: { consumed: 1847, target: 2200, percentage: 84 },
    proteins: { consumed: 89, target: 120, percentage: 74 },
    carbs: { consumed: 245, target: 275, percentage: 89 },
    fats: { consumed: 67, target: 80, percentage: 84 },
    water: { consumed: 1.8, target: 2.5, percentage: 72 }
  };

  const macros = [
    {
      name: "Protéines",
      consumed: nutritionData.proteins.consumed,
      target: nutritionData.proteins.target,
      percentage: nutritionData.proteins.percentage,
      color: "bg-accent",
      unit: "g"
    },
    {
      name: "Glucides",
      consumed: nutritionData.carbs.consumed,
      target: nutritionData.carbs.target,
      percentage: nutritionData.carbs.percentage,
      color: "bg-secondary",
      unit: "g"
    },
    {
      name: "Lipides",
      consumed: nutritionData.fats.consumed,
      target: nutritionData.fats.target,
      percentage: nutritionData.fats.percentage,
      color: "bg-primary",
      unit: "g"
    }
  ];

  return (
    <div className="space-y-4">
      {/* Calories principales */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            Nutrition Aujourd'hui
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Calories */}
          <div className="text-center space-y-2">
            <div className="relative inline-flex items-center justify-center w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
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
                  strokeDasharray={`${nutritionData.calories.percentage * 3.14} 314`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">
                  {nutritionData.calories.consumed}
                </span>
                <span className="text-xs text-muted-foreground">
                  /{nutritionData.calories.target} kcal
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {nutritionData.calories.target - nutritionData.calories.consumed} kcal restantes
            </p>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-4">
            {macros.map((macro, index) => (
              <div key={index} className="text-center space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {macro.name}
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-bold text-foreground">
                    {macro.consumed}<span className="text-xs text-muted-foreground">/{macro.target}{macro.unit}</span>
                  </div>
                  <Progress 
                    value={macro.percentage} 
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground">
                    {macro.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Hydratation */}
          <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
            <div className="flex items-center gap-3">
              <Droplets className="h-5 w-5 text-secondary" />
              <div>
                <p className="font-medium">Hydratation</p>
                <p className="text-sm text-muted-foreground">
                  {nutritionData.water.consumed}L / {nutritionData.water.target}L
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-secondary">
                {nutritionData.water.percentage}%
              </div>
              <Progress value={nutritionData.water.percentage} className="w-16 h-2" />
            </div>
          </div>

          {/* Actions rapides */}
          <div className="flex gap-2">
            <Button className="flex-1" variant="default">
              <ScanLine className="h-4 w-4 mr-2" />
              Scanner
            </Button>
            <Button className="flex-1" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};