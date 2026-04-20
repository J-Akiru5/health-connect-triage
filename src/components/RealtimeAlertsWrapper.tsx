import React from "react";
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts";

const RealtimeAlertsWrapper = ({ children }: { children: React.ReactNode }) => {
  useRealtimeAlerts();
  return <>{children}</>;
};

export default RealtimeAlertsWrapper;
