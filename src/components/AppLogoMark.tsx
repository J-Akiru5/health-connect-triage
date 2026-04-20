import { cn } from "@/lib/utils";

type AppLogoMarkProps = {
  className?: string;
};

/**
 * Brand mark: rounded care cross with signal arcs (telehealth).
 * Uses currentColor — pair with text-primary-foreground on primary fills, or text-primary on light surfaces.
 */
export function AppLogoMark({ className }: AppLogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={cn(className)}
      aria-hidden
    >
      <path
        d="M12 6.25v11.5M6.25 12h11.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M14.25 6.75c2.15-1.1 4.85-.25 6.35 2.15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.88}
      />
      <path
        d="M15.25 4.75c3.35-.65 6.65 1.35 7.85 5.15"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        opacity={0.52}
      />
    </svg>
  );
}
