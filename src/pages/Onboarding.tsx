import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

/** Legacy onboarding redirect — flow moved to /inscription. */
export function Onboarding() {
  const navigate = useNavigate();
  useEffect(() => { navigate({ to: "/inscription" }); }, [navigate]);
  return null;
}
