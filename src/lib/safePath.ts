/**
 * Ensures in-app navigation targets are safe strings under our SPA.
 * Prevents paths like "/undefined" when a template literal received undefined.
 */
export function safeInternalPath(path: string | null | undefined, fallback: string): string {
  if (path == null || typeof path !== "string") return fallback;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return fallback;
  const pathname = trimmed.split(/[?#]/)[0] ?? "";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.some((s) => s === "undefined")) return fallback;
  return trimmed;
}
