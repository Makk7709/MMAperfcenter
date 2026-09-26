import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { AdminSidebar } from "./AdminSidebar";
import { COACH_ADMIN_PATHS } from "./adminPaths";
import { Loader2 } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { hasAdminAccess, isAdmin, isLoading } = useUserRole();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAdminAccess) {
    return <Navigate to="/" replace />;
  }

  // Coaches only manage videos; the other screens are refused server-side.
  if (!isAdmin && !COACH_ADMIN_PATHS.includes(location.pathname)) {
    return <Navigate to={COACH_ADMIN_PATHS[0]} replace />;
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        isAdmin={isAdmin}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
