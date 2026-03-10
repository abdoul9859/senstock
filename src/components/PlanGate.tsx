import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import UpgradePrompt from "./UpgradePrompt";

interface PlanGateProps {
  module: string;
  children: ReactNode;
}

export default function PlanGate({ module, children }: PlanGateProps) {
  const { hasModule } = useAuth();

  if (!hasModule(module)) {
    return <UpgradePrompt module={module} />;
  }

  return <>{children}</>;
}
