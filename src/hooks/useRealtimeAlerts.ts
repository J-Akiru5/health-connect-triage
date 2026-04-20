import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { useAuth } from "@/contexts/AuthContext";

export function useRealtimeAlerts() {
  const { profile } = useAuth();
  const isBhwOrClinician = profile?.role === "bhw" || profile?.role === "clinician";

  useEffect(() => {
    if (!isBhwOrClinician) return;

    // Listen to new triage results
    const channel = supabase
      .channel("public:ai_triage_results")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_triage_results" },
        (payload) => {
          const newTriage = payload.new as { triage_level: string };

          // Only alert for emergency or urgent
          if (
            newTriage.triage_level === "emergency" ||
            newTriage.triage_level === "urgent"
          ) {
            Swal.fire({
              title: "High-Risk Alert!",
              text: `A new ${newTriage.triage_level.toUpperCase()} triage case has just been submitted. Please check the Triage Monitor immediately.`,
              icon: "warning",
              confirmButtonColor: "#dc2626",
              confirmButtonText: "View Monitor",
              toast: true,
              position: "top-end",
              showConfirmButton: false,
              timer: 8000,
              timerProgressBar: true,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Realtime triage alerts subscribed");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isBhwOrClinician]);
}
