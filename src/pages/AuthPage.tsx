import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Dentro do componente AuthPage:
const { session, loading } = useAuth();
const navigate = useNavigate();

useEffect(() => {
  if (!loading && session) {
    navigate("/", { replace: true });
  }
}, [session, loading, navigate]);
