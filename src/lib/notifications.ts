type MaybePostgrestError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

let warnedMissingNotificationsTable = false;

export function isMissingNotificationsTableError(error: unknown): boolean {
  const err = error as MaybePostgrestError | null | undefined;
  if (!err) return false;

  if (err.code === "PGRST205") return true;

  const combined = `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();
  return combined.includes("notifications") && combined.includes("not found");
}

export function handleMissingNotificationsTable(error: unknown): boolean {
  if (!isMissingNotificationsTableError(error)) return false;

  if (!warnedMissingNotificationsTable) {
    console.warn(
      "Notifications table is missing in Supabase (PGRST205). Notifications UI will be disabled until the table exists."
    );
    warnedMissingNotificationsTable = true;
  }

  return true;
}
