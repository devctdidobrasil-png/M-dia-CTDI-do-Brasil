import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Search, Film, Image as ImageIcon, Presentation, 
  Clock, LogOut, Trash2, Database, Users, History, Plus, 
  Check, Eye, Sparkles, CloudUpload, Activity, UsersIcon, Shield, RefreshCw
} from "lucide-react";
import { FileRecord, AccessLog, UserProfile, DashboardStats, AuthSession } from "../types";
import UnifiedPlayer from "./UnifiedPlayer";

interface AdminDashboardProps {
  session: AuthSession;
  onLogout: () => void;
}

export default function AdminDashboard({ session, onLogout }: AdminDashboardProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalFiles: 0,
    totalSizeBytes: 0,
    totalViews: 0,
    totalLogins: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Search & Filter state for gallery
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "video" | "image" | "ppt">("all");
  const [activeDepartment, setActiveDepartment] = useState("Todos");
  
  // Log filter
  const [logSearch, setLogSearch] = useState("");
  const [logFilterAction, setLogFilterAction] = useState<string>("all");

  // User creation form
  const [newUsername, setNewUsername] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'viewer' | 'uploader'>('uploader');
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserSetor, setNewUserSetor] = useState("Geral");
  const [userSuccessMessage, setUserSuccessMessage] = useState("");
  const [userErrorMessage, setUserErrorMessage] = useState("");

  // Upload file state
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [uploadFileSetor, setUploadFileSetor] = useState("Geral");
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  // Player state
  const [selectedFileForPlayer, setSelectedFileForPlayer] = useState<FileRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk synchronizer fetch
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const filesRes = await fetch("/api/files");
      const filesData = await filesRes.json();
      setFiles(filesData);

      const logsRes = await fetch("/api/logs");
      const logsData = await logsRes.json();
      setLogs(logsData);

      const usersRes = await fetch("/api/users");
      const usersData = await usersRes.json();
      setUsers(usersData);

      const statsRes = await fetch("/api/dashboard/stats");
      const statsData = await statsRes.json();
      setStats(statsData);

      setLoading(false);
    } catch (err) {
      console.error("Erro ao ler dados administrativos do servidor:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Manage accounts creation handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSuccessMessage("");
    setUserErrorMessage("");

    if (!newUsername.trim()) {
      setUserErrorMessage("O nome do usuário não pode estar em branco.");
      return;
    }

    // Standard lowercase validation
    const cleanUsername = newUsername.trim().toLowerCase();
    
    // Check characters for safety
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setUserErrorMessage("O nome de usuário deve conter apenas letras, números e sublinhados.");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          role: newUserRole,
          setor: newUserSetor,
          password: newUserPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setUserErrorMessage(data.error || "Houve erro ao registrar perfil.");
        return;
      }

      const rawPass = newUserPassword.trim() || `${data.username}123`;
      setNewUsername("");
      setNewUserPassword("");
      setNewUserSetor("Geral");
      // Prompt helper for local logins info
      setUserSuccessMessage(`Usuário '${data.username}' adicionado no setor '${data.setor || 'Geral'}'! Perfil: '${data.role}'. Senha de acesso: ${rawPass}`);
      handleRefresh();
    } catch (err) {
      console.error(err);
      setUserErrorMessage("Houve falha de comunicação com o servidor.");
    }
  };

  // Manage accounts delete handler
  const handleDeleteUser = async (usernameToDelete: string) => {
    if (!window.confirm(`Tem certeza que deseka apagar o usuário '${usernameToDelete}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${usernameToDelete}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Não foi possível remover usuário.");
        return;
      }

      handleRefresh();
    } catch (e) {
      console.error(e);
      alert("Houve erro ao conectar com o serviço de banco de dados.");
    }
  };

  // Handle Drag events for multipart files
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setUploadError("");
    setUploadSuccess("");

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    const isPpt = file.name.endsWith(".pptx") || 
                  file.name.endsWith(".ppt") || 
                  file.name.endsWith(".pps") || 
                  file.name.endsWith(".ppsx") || 
                  file.type.includes("presentation") || 
                  file.type.includes("powerpoint") ||
                  file.type.includes("officedocument.presentationml");

    if (!isVideo && !isImage && !isPpt) {
      setUploadError("Formato de arquivo inválido. Por favor, envie apenas vídeos, fotos ou arquivos PowerPoint (.ppt, .pptx).");
      setSelectedFileForUpload(null);
      return;
    }

    // Limit to 3GB
    if (file.size > 3072 * 1024 * 1024) {
      setUploadError("O tamanho do arquivo excede o limite máximo permitido de 3GB.");
      setSelectedFileForUpload(null);
      return;
    }

    setSelectedFileForUpload(file);
  };

  // Handle AJAX file upload with dynamic simulated progress
  const handleUploadSubmit = async () => {
    if (!selectedFileForUpload) return;

    setIsUploading(true);
    setUploadProgress(10);
    setUploadError("");
    setUploadSuccess("");

    const formData = new FormData();
    formData.append("file", selectedFileForUpload);
    formData.append("uploader", session.username);
    formData.append("setor", uploadFileSetor);

    // Dynamic progress slider interval
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 150);

    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Houve erro ao processar o upload do arquivo.");
        setIsUploading(false);
        return;
      }

      setTimeout(() => {
        setUploadSuccess(`Sucesso! '${selectedFileForUpload.name}' foi gravado para o setor '${data.setor || 'Geral'}' e está disponível.`);
        setSelectedFileForUpload(null);
        setUploadFileSetor("Geral");
        setIsUploading(false);
        setUploadProgress(0);
        handleRefresh();
      }, 500);

    } catch (err) {
      clearInterval(progressInterval);
      setUploadError("Falha de conexão com o servidor de mídias.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle files deletion CRUD
  const handleDeleteFile = async (fileRecord: FileRecord) => {
    if (!window.confirm(`ATENÇÃO: Deseja excluir definitivamente o arquivo '${fileRecord.originalName}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/files/${fileRecord.id}?deletedBy=${session.username}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Não foi possível apagar arquivo.");
        return;
      }

      handleRefresh();
    } catch (e) {
      console.error(e);
      alert("Houve erro ao processar remoção física.");
    }
  };

  const getFileCategory = (mime: string, name: string) => {
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("image/")) return "image";
    return "ppt";
  };

  // Filtration logic for video/images/powerpoint grids
  const filteredFiles = files.filter(f => {
    const matchesSearch = f.originalName.toLowerCase().includes(search.toLowerCase());
    const fileSetor = f.setor || "Geral";
    const matchesDept = activeDepartment === "Todos" || fileSetor.toLowerCase() === activeDepartment.toLowerCase();

    if (!matchesDept) return false;
    if (activeCategory === "all") return matchesSearch;
    const cat = getFileCategory(f.mimetype, f.originalName);
    return cat === activeCategory && matchesSearch;
  });

  // Log rows filtering
  const filteredLogs = logs.filter(l => {
    const searchString = `${l.username} ${l.details} ${l.action}`.toLowerCase();
    const matchesSearch = searchString.includes(logSearch.toLowerCase());
    if (logFilterAction === "all") return matchesSearch;
    return l.action === logFilterAction && matchesSearch;
  });

  const getLogBadgeStyle = (action: string) => {
    switch(action) {
      case 'login': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'upload': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'delete': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'user_created': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'view': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getLogTranslation = (action: string) => {
    switch(action) {
      case 'login': return 'Acesso / Login';
      case 'upload': return 'Upload de mídia';
      case 'delete': return 'Exclusão';
      case 'user_created': return 'Cadastro Usuário';
      case 'view': return 'Visualização';
      case 'system_boot': return 'Inicialização';
      default: return action;
    }
  };

  return (
    <div id="admin_dashboard" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Dynamic Dashboard Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-teal-400 rounded-lg text-white shadow-md">
              <Database size={20} />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-teal-300 bg-clip-text text-transparent">
                Portal Multimídia
              </span>
              <span className="ml-2 text-[10px] uppercase font-mono px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20 leading-none font-semibold">
                Administrador
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-400">Logado como</p>
              <p className="text-xs font-semibold text-teal-400 font-mono">
                {session.username} <span className="text-[10px] text-slate-500 font-sans">({session.setor || 'Administração'})</span>
              </p>
            </div>
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500 hover:text-white border border-rose-500/20 hover:border-transparent transition-all text-xs font-medium cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        
        {/* Banner with sync controls */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 p-6 sm:p-8 border border-slate-800 relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-widest">
                <Sparkles size={14} />
                <span>Painel Corporativo</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
                Painel Administrativo do Portal
              </h2>
              <p className="text-sm text-slate-400 max-w-xl">
                Gerencie arquivos, cadastre usuários espectadores para visualização segura e monitore todos os logs de acesso em tempo real no banco de dados.
              </p>
            </div>
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 self-start md:self-center px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl transition-all text-xs cursor-pointer"
              title="Sincronizar dados"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Atualizar Painel</span>
            </button>
          </div>
        </div>

        {/* 1. METRICS GRID BAR */}
        <section id="admin_stats_grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="rounded-xl bg-slate-950 border border-slate-850 p-4 sm:p-5 flex items-center gap-4">
            <span className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
              <Film size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 truncate">Total Arquivos</p>
              <h3 className="text-lg sm:text-2xl font-extrabold font-mono text-slate-100">{stats.totalFiles}</h3>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-850 p-4 sm:p-5 flex items-center gap-4">
            <span className="p-3 bg-teal-500/10 text-teal-400 rounded-lg shrink-0">
              <CloudUpload size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 truncate">Volume Gravado</p>
              <h3 className="text-lg sm:text-2xl font-extrabold font-mono text-slate-100">
                {(stats.totalSizeBytes / (1024 * 1024)).toFixed(1)} <span className="text-xs font-normal">MB</span>
              </h3>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-850 p-4 sm:p-5 flex items-center gap-4">
            <span className="p-3 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
              <Eye size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 truncate">Mídias Played</p>
              <h3 className="text-lg sm:text-2xl font-extrabold font-mono text-slate-100">{stats.totalViews}</h3>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-850 p-4 sm:p-5 flex items-center gap-4">
            <span className="p-3 bg-sky-500/10 text-sky-400 rounded-lg shrink-0">
              <Activity size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 truncate">Logins Totais</p>
              <h3 className="text-lg sm:text-2xl font-extrabold font-mono text-slate-100">{stats.totalLogins}</h3>
            </div>
          </div>
        </section>

        {/* 2. CORE LAYOUT SPLIT: UPLOADER AND USERS MANAGER */}
        <section id="uploader_and_credentials_workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* A. Robust Multer drag & drop file uploader (8 columns) */}
          <div className="lg:col-span-7 flex flex-col gap-4 rounded-xl bg-slate-950 border border-slate-850 p-5 sm:p-6 shadow-md">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CloudUpload className="text-teal-400" size={18} />
                Carregador Multimídia Integrado
              </h3>
              <p className="text-xs text-slate-450 mt-1">
                Suporta carregar vídeos (MP4, WEBM), fotos (PNG, JPG, WEBP) e apresentações de PowerPoint (PPT, PPTX) de até 3GB.
              </p>
            </div>

            {/* Drag Zone */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative min-h-44 ${
                dragActive 
                  ? 'border-teal-400 bg-teal-500/5' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".mp4,.webm,.ogg,.mov,.m4v,.png,.jpg,.jpeg,.gif,.svg,.webp,.ppt,.pptx,.pps,.ppsx"
              />
              
              <CloudUpload size={32} className={`mb-3 ${dragActive ? 'text-teal-400' : 'text-slate-500'}`} />
              
              {selectedFileForUpload ? (
                <div className="truncate max-w-full px-4 select-all" onClick={e => e.stopPropagation()}>
                  <p className="text-sm font-semibold text-teal-400 truncate">{selectedFileForUpload.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{(selectedFileForUpload.size / (1024 * 1024)).toFixed(2)} MB</p>
                  <p className="text-[10px] text-indigo-400 mt-1 bg-indigo-500/10 px-2 py-0.5 rounded-full inline-block">Pronto para carregar</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-300">
                    Arraste o arquivo ou <span className="text-teal-400 underline">clique para procurar</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2">Vídeo, Imagem ou PowerPoint (Max. 3GB)</p>
                </div>
              )}
            </div>

            {/* File Sector (Destinatário) option */}
            <div className="flex flex-col gap-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-850">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Setor de Destino da Mídia
              </label>
              <div className="flex gap-2">
                <select 
                  value={["Geral", "Marketing", "Financeiro", "TI", "Vendas", "Diretoria", "Recursos Humanos"].includes(uploadFileSetor) ? uploadFileSetor : "Outro"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "Outro") {
                      setUploadFileSetor(val);
                    } else {
                      setUploadFileSetor("");
                    }
                  }}
                  className="flex-1 bg-slate-950 text-slate-200 px-3 py-1.5 text-xs border border-slate-800 focus:border-teal-450 rounded-lg outline-none cursor-pointer"
                >
                  <option value="Geral">Geral</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="TI">TI / Tecnologia</option>
                  <option value="Vendas">Vendas</option>
                  <option value="Diretoria">Diretoria</option>
                  <option value="Recursos Humanos">Recursos Humanos</option>
                  <option value="Outro">Outro setor (Digitar...)</option>
                </select>

                {(!["Geral", "Marketing", "Financeiro", "TI", "Vendas", "Diretoria", "Recursos Humanos"].includes(uploadFileSetor)) && (
                  <input 
                    type="text"
                    placeholder="Nome do Setor"
                    value={uploadFileSetor}
                    onChange={(e) => setUploadFileSetor(e.target.value)}
                    className="w-1/2 bg-slate-950 text-slate-200 px-3 py-1.5 text-xs border border-slate-800 focus:border-teal-450 rounded-lg outline-none"
                  />
                )}
              </div>
            </div>

            {/* Error & Success Feedback displays */}
            {uploadError && (
              <div className="rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 px-3 py-2 text-xs font-medium">
                {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-2 text-xs font-medium">
                {uploadSuccess}
              </div>
            )}

            {/* Upload Button Progress bar */}
            {isUploading ? (
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Enviando arquivo para o banco de dados...</span>
                  <span className="font-mono font-bold text-teal-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-teal-400 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : (
              <button 
                onClick={handleUploadSubmit}
                disabled={!selectedFileForUpload}
                className="w-full mt-2 py-2 px-4 rounded-xl font-medium text-slate-900 bg-teal-400 disabled:bg-slate-800 disabled:text-slate-500 hover:bg-teal-300 transition-colors text-xs flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer"
              >
                <CloudUpload size={14} />
                <span>Salvar no Banco de Dados</span>
              </button>
            )}
          </div>

          {/* B. Database User credentials register (5 columns) */}
          <div id="credentials_manager_card" className="lg:col-span-5 flex flex-col gap-4 rounded-xl bg-slate-950 border border-slate-850 p-5 sm:p-6 shadow-md justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="text-teal-400 shrink-0" size={18} />
                <h3 className="text-base font-bold text-slate-100">Controle de Credenciais</h3>
              </div>
              <p className="text-xs text-slate-450 mt-1">
                Adicione credenciais customizadas de acesso (Administrador ou Espectador) para simular o controle de acessos individuais.
              </p>
            </div>

            {/* Mini Cadastro Form */}
            <form onSubmit={handleCreateUser} className="space-y-3 my-2 bg-slate-900/60 p-3 rounded-lg border border-slate-850">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nome de Usuário</label>
                  <input 
                    type="text"
                    placeholder="ex: lucas"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-1.5 text-xs border border-slate-800 focus:border-indigo-500 rounded-lg outline-none lowercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Senha de Acesso</label>
                  <input 
                    type="password"
                    placeholder="Opcional (padrão: nome123)"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-1.5 text-xs border border-slate-800 focus:border-indigo-500 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Perfil / Permissão</label>
                  <select 
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'viewer' | 'uploader')}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-1.5 text-xs border border-slate-800 focus:border-indigo-500 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="uploader">Uploader (Apenas Subir Mídia)</option>
                    <option value="viewer">Viewer (Apenas Espectador)</option>
                    <option value="admin">Admin (Acesso Total)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Setor / Departamento</label>
                  <div className="flex gap-1.5">
                    <select 
                      value={["Geral", "Marketing", "Financeiro", "TI", "Vendas", "Diretoria", "Recursos Humanos"].includes(newUserSetor) ? newUserSetor : "Outro"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== "Outro") {
                          setNewUserSetor(val);
                        } else {
                          setNewUserSetor("");
                        }
                      }}
                      className="flex-1 bg-slate-950 text-slate-200 px-2 py-1.5 text-xs border border-slate-800 focus:border-indigo-500 rounded-lg outline-none cursor-pointer"
                    >
                      <option value="Geral">Geral</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="TI">TI / Tecnologia</option>
                      <option value="Vendas">Vendas</option>
                      <option value="Diretoria">Diretoria</option>
                      <option value="Recursos Humanos">Recursos Humanos</option>
                      <option value="Outro">Outro setor (Digitar...)</option>
                    </select>

                    {(!["Geral", "Marketing", "Financeiro", "TI", "Vendas", "Diretoria", "Recursos Humanos"].includes(newUserSetor)) && (
                      <input 
                        type="text"
                        placeholder="Setor"
                        value={newUserSetor}
                        onChange={(e) => setNewUserSetor(e.target.value)}
                        className="w-20 bg-slate-950 text-slate-200 px-2 py-1.5 text-xs border border-slate-800 focus:border-indigo-500 rounded-lg outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              {userErrorMessage && <p className="text-[10px] text-rose-400 leading-tight">{userErrorMessage}</p>}
              {userSuccessMessage && <p className="text-[10px] text-emerald-400 leading-tight font-mono">{userSuccessMessage}</p>}

              <button 
                type="submit"
                className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>Salvar Nova Credencial</span>
              </button>
            </form>

            {/* Account lists with removal option */}
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              <p className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">Acessar com Usuários Ativos:</p>
              <div className="space-y-1.5">
                {users.map(u => (
                  <div key={u.username} className="flex items-center justify-between bg-slate-900 px-2 py-1.5 rounded border border-slate-850/60 text-[11px]">
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${u.role === 'admin' ? 'bg-indigo-400' : (u.role === 'uploader' ? 'bg-amber-400' : 'bg-teal-400')}`} />
                      <span className="font-mono text-slate-200 font-semibold truncate" title={u.username}>{u.username}</span>
                      <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded-md text-teal-300 font-medium truncate max-w-[80px]" title={`Setor: ${u.setor || 'Geral'}`}>
                        {u.setor || 'Geral'}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase shrink-0">{u.role === 'admin' ? 'Admin' : (u.role === 'uploader' ? 'Uploader' : 'Viewer')}</span>
                    </div>
                    
                    {u.username !== 'admin' && u.username !== 'viewer' ? (
                      <button 
                        onClick={() => handleDeleteUser(u.username)}
                        className="text-rose-400 hover:bg-rose-500/10 p-1 rounded transition-colors cursor-pointer"
                        title="Apagar usuário do banco"
                      >
                        <Trash2 size={11} />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-600 italic">Padrão</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. ARQUIVOS DISPONÍVEIS - GRID WITH VIEW & PLAYBACK OPTIONS */}
        <section id="media_library_section" className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Film className="text-teal-400" size={18} />
                Acervo de Arquivos ({filteredFiles.length})
              </h3>
              <p className="text-xs text-slate-450 mt-1">Gerencie, exclua e assista os conteúdos multimídia ativos.</p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button 
                onClick={() => setActiveCategory("all")}
                className={`px-3 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors ${activeCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-850 text-slate-400 hover:text-white'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setActiveCategory("video")}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${activeCategory === 'video' ? 'bg-sky-600 text-white' : 'bg-slate-850 text-slate-400'}`}
              >
                <Film size={11} />
                Vídeos
              </button>
              <button 
                onClick={() => setActiveCategory("image")}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${activeCategory === 'image' ? 'bg-rose-600 text-white' : 'bg-slate-850 text-slate-400'}`}
              >
                <ImageIcon size={11} />
                Imagens
              </button>
              <button 
                onClick={() => setActiveCategory("ppt")}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${activeCategory === 'ppt' ? 'bg-teal-600 text-white' : 'bg-slate-850 text-slate-400'}`}
              >
                <Presentation size={11} />
                PPTs
              </button>
            </div>
          </div>

          {/* Department (Setor) Tabs */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Visualizar Departamento / Setor específico (Abas):</span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-2 scrollbar-thin scrollbar-thumb-slate-800">
              {(() => {
                const availableSetores = Array.from(new Set([
                  "Todos", "Geral", "Marketing", "Financeiro", "TI", "Vendas", "Diretoria", "Recursos Humanos",
                  ...users.map(u => u.setor).filter(Boolean),
                  ...files.map(f => f.setor).filter(Boolean)
                ]));
                return availableSetores.map(dept => {
                  const isActive = activeDepartment.toLowerCase() === dept.toLowerCase();
                  const deptFilesCount = files.filter(f => dept === "Todos" || (f.setor || "Geral").toLowerCase() === dept.toLowerCase()).length;
                  return (
                    <button
                      key={dept}
                      onClick={() => setActiveDepartment(dept)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 flex items-center gap-1.5 border ${
                        isActive 
                          ? 'bg-gradient-to-r from-teal-500 to-indigo-650 border-transparent text-white shadow-lg shadow-teal-500/15' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span>{dept}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-950 text-slate-500'
                      }`}>
                        {deptFilesCount}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Table / Grid list */}
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-xl bg-slate-950 border border-slate-850 text-slate-500">
              <Database size={32} className="mb-2 text-slate-700" />
              <p className="text-xs font-mono">Sem conteúdos correspondentes nesta categoria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredFiles.map(f => {
                const isVideo = f.mimetype.startsWith("video/");
                const isImage = f.mimetype.startsWith("image/");
                
                return (
                  <div 
                    key={f.id} 
                    className="flex flex-col rounded-xl bg-slate-950 border border-slate-850/60 overflow-hidden hover:border-teal-500/30 transition-all shadow group"
                  >
                    {/* Visual box preview */}
                    <div 
                      onClick={() => setSelectedFileForPlayer(f)}
                      className="aspect-video bg-slate-900 border-b border-slate-850/60 relative flex items-center justify-center overflow-hidden cursor-pointer"
                    >
                      {/* Visual overlays */}
                      {isVideo && (
                        <div className="absolute inset-0 bg-slate-950/20 flex items-center justify-center transition-all group-hover:scale-105">
                          <Film className="absolute top-2.5 left-2.5 text-sky-400" size={14} />
                          <div className="h-9 w-9 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all">
                            <Play size={14} className="ml-0.5" />
                          </div>
                        </div>
                      )}

                      {isImage && (
                        <div className="absolute inset-0 transition-all group-hover:scale-105">
                          <img 
                            src={`/uploads/files/${f.filename}`} 
                            referrerPolicy="no-referrer"
                            alt={f.originalName} 
                            className="h-full w-full object-cover opacity-85 hover:opacity-100"
                          />
                          <ImageIcon className="absolute top-2.5 left-2.5 text-rose-400 drop-shadow-sm" size={14} />
                        </div>
                      )}

                      {!isVideo && !isImage && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950 to-teal-950 flex flex-col p-3 justify-between transition-all group-hover:scale-105">
                          <Presentation className="text-teal-400" size={16} />
                          <div className="text-center font-extrabold text-[10px] font-mono tracking-wider text-slate-200">
                            PPT INTERATIVO
                          </div>
                          <span className="text-[8px] text-right text-teal-300/40">Visualizar</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata summary */}
                    <div className="p-3.5 flex flex-col justify-between flex-1 gap-2.5">
                      <div className="truncate">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-200 truncate pr-5 relative select-all" title={f.originalName}>
                          {f.originalName}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>Por: <span className="text-slate-400">{f.uploadedBy}</span></span>
                          <span className="h-1 w-1 rounded-full bg-slate-800 shrink-0" />
                          <span className="text-[8px] bg-slate-900 border border-slate-800 text-teal-300 px-1 py-0.2 rounded font-sans uppercase font-bold tracking-wide">
                            {f.setor || "Geral"}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-900 pt-2 shrink-0">
                        <span>{(f.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-0.5 text-slate-400">
                            <Eye size={10} />
                            {f.views}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(f);
                            }}
                            className="text-slate-500 hover:text-rose-400 rounded p-1 hover:bg-rose-500/10 cursor-pointer"
                            title="Apagar arquivo"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. ACTIVITY MONITOR: MONITOR ALL VISITS & EXECUTED LOGS */}
        <section id="monitoring_section" className="flex flex-col gap-4 rounded-xl bg-slate-950 border border-slate-850 p-5 sm:p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <History className="text-teal-400" size={18} />
                Logs e Auditoria de Acessos
              </h3>
              <p className="text-xs text-slate-450 mt-1">Sessões e ações registradas instantaneamente no banco de dados.</p>
            </div>

            {/* Filter toolbar log */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input 
                type="text"
                placeholder="Pesquisar log..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded-lg outline-none max-w-44 focus:border-indigo-500"
              />
              <select 
                value={logFilterAction}
                onChange={e => setLogFilterAction(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-200 px-2 py-1.5 rounded-lg outline-none cursor-pointer"
              >
                <option value="all">Todas Ações</option>
                <option value="login">Geral Logins</option>
                <option value="upload">Envio Uploads</option>
                <option value="view">Visualizações (Views)</option>
                <option value="delete">Exclusões</option>
                <option value="user_created">Usuários Novos</option>
              </select>
            </div>
          </div>

          {/* Responsive table */}
          <div className="overflow-x-auto max-h-72 border border-slate-850 rounded-lg bg-slate-900/40">
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 select-none">
                  <th className="p-2 sm:p-3">Data/Hora</th>
                  <th className="p-2 sm:p-3">Usuário</th>
                  <th className="p-2 sm:p-3">Perfil</th>
                  <th className="p-2 sm:p-3">Ação</th>
                  <th className="p-2 sm:p-3">Histórico / Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">Nenhum evento registrado encontrado.</td>
                  </tr>
                ) : (
                  filteredLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-900/90 transition-colors">
                      <td className="p-2 sm:p-3 text-slate-400 whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleDateString('pt-BR')} {new Date(l.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                      </td>
                      <td className="p-2 sm:p-3 font-semibold text-slate-200 truncate max-w-32">{l.username}</td>
                      <td className="p-2 sm:p-3 uppercase text-[9px] text-slate-400">{l.role}</td>
                      <td className="p-2 sm:p-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wide ${getLogBadgeStyle(l.action)}`}>
                          {getLogTranslation(l.action)}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3 text-slate-300 leading-snug break-words max-w-sm sm:max-w-md md:max-w-xl pr-4">{l.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* Dynamic Slide Viewer player */}
      {selectedFileForPlayer && (
        <UnifiedPlayer 
          file={selectedFileForPlayer}
          onClose={() => setSelectedFileForPlayer(null)}
          username={session.username}
          role={session.role}
          onViewLogged={handleRefresh}
        />
      )}

      {/* Admin Footer */}
      <footer className="bg-slate-950 py-4 border-t border-slate-900 text-center text-xs text-slate-500 shrink-0">
        <p>&copy; {new Date().getFullYear()} Portal de Mídia Integrado. Painel Administrativo de Auditoria.</p>
      </footer>
    </div>
  );
}
