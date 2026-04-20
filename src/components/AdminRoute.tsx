import { ProtectedRoute } from "@/components/ProtectedRoute";

type AdminRouteProps = { children: React.ReactNode };

/** Protects routes so only users with role `admin` can access. */
export function AdminRoute({ children }: AdminRouteProps) {
  return <ProtectedRoute allowedRoles={["admin"]}>{children}</ProtectedRoute>;
}
