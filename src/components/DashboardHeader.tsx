import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Search, User, Menu, Dumbbell, LogOut, History, BarChart3, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  userName?: string;
  isPremium?: boolean;
  onSignOut?: () => void;
}

export const DashboardHeader = ({ userName = "Coach", isPremium = false, onSignOut }: DashboardHeaderProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-card backdrop-blur-md border-b border-border/50 shadow-card">
      <div className="container flex items-center justify-between h-16 px-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            className="p-2 hover:bg-transparent"
            onClick={() => navigate("/")}
          >
            <div className="p-2 bg-gradient-primary rounded-xl shadow-primary">
              <Dumbbell className="h-6 w-6 text-primary-foreground" />
            </div>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold bg-gradient-hero bg-clip-text text-transparent">
              Coach Sportif IA
            </h1>
            <p className="text-xs text-muted-foreground">
              Bonjour {userName} ! {isPremium && "✨"}
            </p>
          </div>
        </div>
        
        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-2">
          <Button 
            variant={location.pathname === "/" ? "default" : "ghost"} 
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Button>
          <Button 
            variant={location.pathname === "/history" ? "default" : "ghost"} 
            size="sm"
            onClick={() => navigate("/history")}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            Historique
          </Button>
          <Button 
            variant={location.pathname === "/statistics" ? "default" : "ghost"} 
            size="sm"
            onClick={() => navigate("/statistics")}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Stats
          </Button>
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden md:block">
            {searchOpen ? (
              <Input
                placeholder="Rechercher exercices, nutrition..."
                className="w-64 transition-all duration-300"
                onBlur={() => setSearchOpen(false)}
                autoFocus
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                <span className="hidden lg:inline">Rechercher</span>
              </Button>
            )}
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-accent">
              3
            </Badge>
          </Button>

          {/* Premium Badge */}
          {isPremium && (
            <Badge className="bg-gradient-primary text-primary-foreground font-semibold">
              PREMIUM
            </Badge>
          )}

          {/* Profile */}
          <Button variant="ghost" size="sm" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden md:inline">Profil</span>
          </Button>

          {/* Sign Out */}
          {onSignOut && (
            <Button variant="ghost" size="sm" onClick={onSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Sortir</span>
            </Button>
          )}

          {/* Mobile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/")}>
                <Home className="h-4 w-4 mr-2" />
                Accueil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/history")}>
                <History className="h-4 w-4 mr-2" />
                Historique
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/statistics")}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistiques
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};