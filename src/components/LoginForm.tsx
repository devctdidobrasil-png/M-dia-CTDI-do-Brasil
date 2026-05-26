import React, { useState } from "react";
import { Lock, User, Eye, EyeOff, Play, Shield, Sparkles } from "lucide-react";
import { AuthSession } from "../types";

interface LoginFormProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao conectar. Credenciais incorretas.");
        setIsLoading(false);
        return;
      }

      // Successful login
      onLoginSuccess(data);
    } catch (err) {
      console.error(err);
      setError("Falha de conexão com o servidor. Verifique o status.");
      setIsLoading(false);
    }
  };

  // Helper shortcut buttons for instant sandbox testing
  const applyCredentialShortcut = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div id="login_container" className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
      
      {/* Visual background nodes */}
      <div className="absolute top-0 right-0 h-96 w-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-96 w-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative top grid lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-35" />

      {/* Outer block header */}
      <div className="pt-8 px-4 flex justify-center z-10 select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-indigo-500 to-teal-400 rounded-lg text-white shadow-lg shadow-indigo-500/10">
            <Play size={20} className="fill-current text-white ml-0.5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              Portal Multimídia
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md bg-slate-950/80 border border-slate-850 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative">
          
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-teal-400 mb-2">
              <Shield size={22} />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Controle de Segurança</h2>
            <p className="text-xs text-slate-400 mt-1">Insira suas credenciais cadastradas para ter acesso</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 text-xs text-center font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 select-none">
                <User size={13} className="text-slate-400" />
                Nome do Usuário
              </label>
              <input 
                type="text"
                placeholder="Insira seu usuário de acesso"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoFocus
                className="w-full bg-slate-900 focus:bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 text-sm px-3.5 py-2.5 rounded-xl transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1 flex items-center gap-1.5 select-none">
                <Lock size={13} className="text-slate-400" />
                Senha de Acesso
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Insira sua senha de segurança"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-900 focus:bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 text-sm px-3.5 py-2.5 rounded-xl transition-all pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-305 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
            >
              {isLoading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Lock size={14} />
                  <span>Autenticar Usuário</span>
                </>
              )}
            </button>
          </form>

          {/* Demonstration Quick Selector for sandbox reviews */}
          <div className="mt-6 pt-5 border-t border-slate-850">
            <p className="text-[10px] uppercase font-semibold text-slate-500 text-center tracking-wider mb-2 select-none">
              Acesso Rápido para Testes:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => applyCredentialShortcut("admin", "admin123")}
                className="flex flex-col text-left p-2 rounded-xl bg-slate-900 hover:bg-indigo-500/10 border border-slate-800 hover:border-indigo-500/30 transition-all cursor-pointer"
              >
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                  Administrador
                </span>
                <span className="text-[10px] text-slate-500 mt-1 font-mono">User: <b>admin</b></span>
                <span className="text-[10px] text-slate-500 font-mono">Pass: <b>admin123</b></span>
              </button>

              <button
                type="button"
                onClick={() => applyCredentialShortcut("viewer", "viewer123")}
                className="flex flex-col text-left p-2 rounded-xl bg-slate-900 hover:bg-teal-500/10 border border-slate-800 hover:border-teal-500/30 transition-all cursor-pointer"
              >
                <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wide flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                  SÓ REPRODUÇÃO
                </span>
                <span className="text-[10px] text-slate-500 mt-1 font-mono">User: <b>viewer</b></span>
                <span className="text-[10px] text-slate-500 font-mono">Pass: <b>viewer123</b></span>
              </button>
            </div>
            <p className="text-[10px] text-slate-450 mt-2.5 text-center leading-normal max-w-xs mx-auto">
              * Administradores criam credenciais customizadas em tempo real dentro do painel. Usuários novos entram com a senha: <b>[seu_usuario]123</b> ou <b>123456</b>.
            </p>
          </div>

        </div>
      </div>

      <footer className="py-4 text-center text-xs text-slate-600 z-10 select-none">
        <p>&copy; {new Date().getFullYear()} Portal de Mídia Corporativa Seguro.</p>
      </footer>
    </div>
  );
}
