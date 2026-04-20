import { cn } from "@/lib/utils";

type AppLogoMarkProps = {
  className?: string;
};

/**
 * Official Brand Logo: Care Cross knots.
 */
export function AppLogoMark({ className }: AppLogoMarkProps) {
  return (
    <img
      src="/logo.png"
      alt="TeleHealth Logo"
      className={cn("object-contain", className)}
      aria-hidden
    />
  );
}
