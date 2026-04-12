import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/database.types";

type ProtectedRouteProps = {
  children: React.ReactNode;
  /** If set, only these roles can access. Otherwise any authenticated user can. */
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session) {
    const from = { pathname: location.pathname, search: location.search, hash: location.hash };
    return <Navigate to="/login" state={{ from }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-destructive font-medium">You don’t have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
