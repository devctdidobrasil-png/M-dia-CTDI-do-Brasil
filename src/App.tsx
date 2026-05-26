import React, { useState, useEffect } from "react";
import { AuthSession } from "./types";
import LoginForm from "./components/LoginForm";
import AdminDashboard from "./components/AdminDashboard";
import ViewerDashboard from "./components/ViewerDashboard";
import UploaderDashboard from "./components/UploaderDashboard";

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [booting, setBooting] = useState(true);

  // Read saved session on boot
  useEffect(() => {
    try {
      const saved = localStorage.getItem("portal_midia_session");
      if (saved) {
        setSession(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Erro lendo sessão salva:", err);
    } finally {
      setBooting(false);
    }
  }, []);

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    localStorage.setItem("portal_midia_session", JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("portal_midia_session");
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-slate-400 font-mono text-xs">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-400 mb-3" />
        <span>INICIALIZANDO PORTAL DE MÍDIA...</span>
      </div>
    );
  }

  // Router dispatcher based on authenticated roles
  if (!session) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  if (session.role === "admin") {
    return <AdminDashboard session={session} onLogout={handleLogout} />;
  }

  if (session.role === "uploader") {
    return <UploaderDashboard session={session} onLogout={handleLogout} />;
  }

  // Viewer / Playback-only mode
  return <ViewerDashboard session={session} onLogout={handleLogout} />;
}
