import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("atheris_token", token);
      refresh().finally(() => navigate("/editor"));
    } else {
      navigate("/login?error=oauth");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-surface-muted dark:text-white/50">
      Signing you in…
    </div>
  );
}
