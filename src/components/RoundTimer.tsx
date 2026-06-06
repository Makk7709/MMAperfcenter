import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, Settings, Timer as TimerIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const RoundTimer = () => {
  const [rounds, setRounds] = useState(3);
  const [roundDuration, setRoundDuration] = useState(180); // 3 minutes en secondes
  const [restDuration, setRestDuration] = useState(60); // 1 minute en secondes
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(roundDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isRest, setIsRest] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      // Son de fin de round
      playBeep();
      
      if (isRest) {
        // Fin du repos, passer au round suivant
        if (currentRound < rounds) {
          setCurrentRound((prev) => prev + 1);
          setTimeLeft(roundDuration);
          setIsRest(false);
        } else {
          // Fin de tous les rounds
          setIsRunning(false);
          setCurrentRound(1);
          setTimeLeft(roundDuration);
          setIsRest(false);
        }
      } else if (currentRound < rounds) {
        // Fin du round, passer au repos
        setTimeLeft(restDuration);
        setIsRest(true);
      } else {
        // Dernier round terminé
        setIsRunning(false);
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isRest, currentRound, rounds, roundDuration, restDuration]);

  const playBeep = () => {
    // Utiliser l'API Web Audio pour créer un bip
    const audioContext = new (globalThis.AudioContext || (globalThis as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "square";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentRound(1);
    setTimeLeft(roundDuration);
    setIsRest(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getDotClass = (index: number) => {
    if (index < currentRound) return "bg-primary";
    if (index === currentRound - 1) return isRest ? "bg-accent" : "bg-primary animate-pulse";
    return "bg-muted";
  };

  const getTimerColorClass = () => {
    if (isRest) return "text-accent";
    if (timeLeft <= 10 && isRunning) return "text-destructive animate-pulse";
    return "text-primary";
  };

  const roundDots = Array.from({ length: rounds }, (_, index) => ({ id: `round-${index}`, index }));

  return (
    <Card className="liquid-glass-solid border-0 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TimerIcon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Timer Combat</h3>
        </div>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-primary">Configuration Timer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rounds">Nombre de rounds</Label>
                <Input
                  id="rounds"
                  type="number"
                  min="1"
                  max="12"
                  value={rounds}
                  onChange={(e) => setRounds(Number.parseInt(e.target.value, 10) || 1)}
                  className="bg-input border-border"
                />
              </div>
              <div>
                <Label htmlFor="roundDuration">Durée du round (secondes)</Label>
                <Input
                  id="roundDuration"
                  type="number"
                  min="30"
                  max="600"
                  value={roundDuration}
                  onChange={(e) => {
                    const val = Number.parseInt(e.target.value, 10) || 30;
                    setRoundDuration(val);
                    if (!isRunning && !isRest) setTimeLeft(val);
                  }}
                  className="bg-input border-border"
                />
              </div>
              <div>
                <Label htmlFor="restDuration">Durée du repos (secondes)</Label>
                <Input
                  id="restDuration"
                  type="number"
                  min="15"
                  max="300"
                  value={restDuration}
                  onChange={(e) => setRestDuration(Number.parseInt(e.target.value, 10) || 15)}
                  className="bg-input border-border"
                />
              </div>
              <Button
                onClick={() => {
                  handleReset();
                  setSettingsOpen(false);
                }}
                className="w-full"
              >
                Appliquer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="text-center space-y-6">
        {/* Round indicator */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Round {currentRound} / {rounds}
          </p>
          <div className="flex gap-2 justify-center">
            {roundDots.map((dot) => (
              <div
                key={dot.id}
                className={`h-2 w-12 rounded-full transition-colors ${getDotClass(dot.index)}`}
              />
            ))}
          </div>
        </div>

        {/* Timer display */}
        <div className="relative">
          <div className={`text-7xl font-bold transition-all ${getTimerColorClass()}`}>
            {formatTime(timeLeft)}
          </div>
          {isRest && (
            <p className="text-accent font-semibold text-lg mt-2 animate-pulse">
              REPOS
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          {isRunning ? (
            <Button
              onClick={handlePause}
              size="lg"
              variant="secondary"
            >
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-primary hover:bg-primary/80"
            >
              <Play className="h-5 w-5 mr-2" />
              Démarrer
            </Button>
          )}
          <Button onClick={handleReset} size="lg" variant="outline">
            <RotateCcw className="h-5 w-5 mr-2" />
            Reset
          </Button>
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Round: {roundDuration / 60} min</p>
          <p>Repos: {restDuration} sec</p>
        </div>
      </div>
    </Card>
  );
};
