import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard";

const ONBOARDING_COMPLETE_KEY = "gestor_grupos_onboarding_complete";

const Index = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const isOnboardingComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";
    if (!isOnboardingComplete) {
      navigate("/onboarding", { replace: true });
    } else {
      setIsChecking(false);
    }
  }, [navigate]);

  if (isChecking) {
    return null;
  }

  return <Dashboard />;
};

export default Index;
