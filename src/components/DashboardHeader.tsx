import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Menu, LogOut, History, BarChart3, Home, Shield, CreditCard, BookOpen } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { NotificationsPopover } from "@/components/NotificationsPopover";
import { KorevLogo } from "@/components/brand/KorevLogo";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  userName?: string;
  onSignOut?: () => void;
}

const NAV_ITEMS = [
  { path: "/", label: "Accueil", icon: Home },
  { path: "/history", label: "Historique", icon: History },
  { path: "/journal", label: "Carnet", icon: BookOpen },
  { path: "/statistics", label: "Stats", icon: BarChart3 },
  { path: "/pricing", label: "Abonnements", icon: CreditCard },
];

export const DashboardHeader = ({ userName = "Coach", onSignOut }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAdminAccess } = useUserRole();
  const { isPaid: isPremium } = useSubscription();

  const navItems = hasAdminAccess ? [...NAV_ITEMS, { path: "/admin", label: "Admin", icon: Shield }] : NAV_ITEMS;
  const isActive = (path: string) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-korev-deep/85 backdrop-blur-md">
      <span aria-hidden className="absolute inset-x-0 bottom-[-1px] h-px bg-gradient-to-r from-transparent via-korev-gold/40 to-transparent" />
      <div className="container flex h-16 items-center justify-between gap-4 px-4">
        {/* Logo & Brand */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Accueil KOREV Performance Center"
        >
          <KorevLogo className="h-9" />
          <span className="hidden flex-col items-start border-l border-border/70 pl-3 sm:flex">
            <span className="korev-eyebrow text-[10px] text-korev-gold/90">Performance Center</span>
            <span className="text-xs text-muted-foreground">Bonjour {userName}</span>
          </span>
        </button>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              aria-current={isActive(path) ? "page" : undefined}
              className={cn(
                "relative inline-flex h-16 items-center gap-2 px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:scale-x-0 after:bg-korev-gold after:transition-transform after:duration-200",
                isActive(path) && "text-foreground after:scale-x-100",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <NotificationsPopover />

          {/* Premium Badge */}
          {isPremium && (
            <Badge className="korev-chamfer border-0 bg-gradient-primary font-mono text-[10px] tracking-[0.16em] text-primary-foreground [--chamfer:6px]">
              PREMIUM
            </Badge>
          )}

          {/* Profile */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => navigate('/profile')}
          >
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
              <DropdownMenuItem onClick={() => navigate("/pricing")}>
                <CreditCard className="h-4 w-4 mr-2" />
                Abonnements
              </DropdownMenuItem>
              {hasAdminAccess && (
                <DropdownMenuItem onClick={() => navigate("/admin")}>
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};