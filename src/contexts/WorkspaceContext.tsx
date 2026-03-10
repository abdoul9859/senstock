import { createContext, useContext, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { workspaces, Workspace } from "@/config/workspaces";

interface WorkspaceContextType {
  current: Workspace;
  setCurrent: (ws: Workspace) => void;
  all: Workspace[];
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive current workspace from URL — always in sync, no state needed
  const current =
    workspaces.find((ws) => location.pathname.startsWith(`/${ws.id}`)) ||
    workspaces[0];

  // Switching workspace = navigating to its first page
  const setCurrent = (ws: Workspace) => {
    navigate(ws.items[0]?.url || "/");
  };

  return (
    <WorkspaceContext.Provider value={{ current, setCurrent, all: workspaces }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};
