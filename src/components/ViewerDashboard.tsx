import React, { useState, useEffect } from "react";
import { 
  Play, Search, Film, Image as ImageIcon, Presentation, 
  Clock, LogOut, Sparkles, Filter, Database, RefreshCw, Eye
} from "lucide-react";
import { FileRecord, AuthSession } from "../types";
import UnifiedPlayer from "./UnifiedPlayer";

interface ViewerDashboardProps {
  session: AuthSession;
  onLogout: () => void;
}

export default function ViewerDashboard({ session, onLogout }: ViewerDashboardProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "video" | "image" | "ppt">("all");
  const [activeDepartment, setActiveDepartment] = useState("Todos");
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch all media files on boot
  useEffect(() => {
    setLoading(true);
    fetch("/api/files")
      .then(res => res.json())
      .then(data => {
        setFiles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar arquivos:", err);
        setLoading(false);
      });
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Helper to categorize mime types
  const getFileIcon = (mime: string, name: string) => {
    if (mime.startsWith("video/")) return <Film className="text-sky-400" size={18} />;
    if (mime.startsWith("image/")) return <ImageIcon className="text-rose-400" size={18} />;
    return <Presentation className="text-teal-400" size={18} />;
  };

  const getCategoryLabel = (mime: string, name: string) => {
    if (mime.startsWith("video/")) return "Vídeo";
    if (mime.startsWith("image/")) return "Imagem";
    return "Apresentação PPT";
  };

  // Filtration logic
  const filteredFiles = files.filter(f => {
    const matchesSearch = f.originalName.toLowerCase().includes(search.toLowerCase());
    
    // Sector department filtration
    const fileSetor = f.setor || "Geral";
    const matchesDept = activeDepartment === "Todos" || fileSetor.toLowerCase() === activeDepartment.toLowerCase();
    
    if (!matchesDept) return false;
    
    if (activeTab === "all") return matchesSearch;
    const isVideo = f.mimetype.startsWith("video/");
    const isImage = f.mimetype.startsWith("image/");
    const isPpt = f.mimetype.includes("presentation") || 
                  f.mimetype.includes("powerpoint") || 
                  f.originalName.endsWith(".pptx") || 
                  f.originalName.endsWith(".ppt");

    if (activeTab === "video") return isVideo && matchesSearch;
    if (activeTab === "image") return isImage && matchesSearch;
    if (activeTab === "ppt") return isPpt && matchesSearch;
    return matchesSearch;
  });

  return (
    <div id="viewer_dashboard" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Dynamic Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-lg text-white shadow-md">
              <Play size={20} className="animate-pulse" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-sky-300 bg-clip-text text-transparent">
                Portal Multimídia
              </span>
              <span className="ml-2 text-[10px] uppercase font-mono px-1.5 py-0.5 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20 leading-none">
                Apenas Reprodução
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-400">Logado como</p>
              <p className="text-xs font-semibold text-slate-200 font-mono">
                {session.username} <span className="text-[10px] text-slate-500 font-sans">({session.setor || 'Geral'})</span>
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

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Welcome Board */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-sky-950 p-6 sm:p-8 border border-slate-800 relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 h-48 w-48 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-widest">
                <Sparkles size={14} />
                <span>Modo de Exibição</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
                Olá, {session.username}! Bem-vindo ao acervo de mídia do setor {session.setor ? <span className="text-teal-400">"{session.setor}"</span> : 'Geral'}.
              </h2>
              <p className="text-sm text-slate-400 max-w-xl">
                Seu perfil de <b className="text-indigo-300">Espectador</b> permite pesquisar e reproduzir todas as imagens, vídeos e arquivos de PowerPoint do setor de forma rápida diretamente no navegador.
              </p>
            </div>
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 self-start md:self-center px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl transition-all text-xs cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Sincronizar Acervo</span>
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
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-650 border-transparent text-white shadow-lg shadow-sky-500/15' 
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

        {/* Filters and Search toolbar */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              <Search size={16} />
            </span>
            <input 
              type="text"
              placeholder="Buscar título do arquivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 hover:bg-slate-925 focus:bg-slate-950 text-slate-200 pl-10 pr-4 py-2 text-sm border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-slate-400 text-xs hidden lg:flex items-center gap-1 shrink-0 mr-2">
              <Filter size={12} />
              Filtrar por:
            </span>
            <button 
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 ${activeTab === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Todos ({files.length})
            </button>
            <button 
              onClick={() => setActiveTab("video")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${activeTab === 'video' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <Film size={12} />
              Vídeos ({files.filter(f => f.mimetype.startsWith("video/")).length})
            </button>
            <button 
              onClick={() => setActiveTab("image")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${activeTab === 'image' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <ImageIcon size={12} />
              Imagens ({files.filter(f => f.mimetype.startsWith("image/")).length})
            </button>
            <button 
              onClick={() => setActiveTab("ppt")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${activeTab === 'ppt' ? 'bg-teal-650 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <Presentation size={12} />
              PowerPoints ({files.filter(f => f.mimetype.includes("presentation") || f.mimetype.includes("powerpoint") || f.originalName.endsWith(".pptx") || f.originalName.endsWith(".ppt")).length})
            </button>
          </div>
        </div>

        {/* Database grid status info */}
        <div id="media_index" className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-slate-950 border border-slate-850">
              <RefreshCw className="text-indigo-400 animate-spin mb-3" size={32} />
              <p className="text-slate-400 text-sm font-mono">Conectando ao banco de dados do acervo...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-slate-950 border border-slate-850 text-center">
              <Database className="text-slate-600 mb-3" size={40} />
              <h3 className="text-base font-semibold text-slate-300">Nenhum arquivo encontrado</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm">
                Nenhum arquivo corresponde aos seus critérios atuais. Peça ao administrador para realizar uploads de imagens, vídeos ou PowerPoints.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFiles.map((f) => {
                const category = getCategoryLabel(f.mimetype, f.originalName);
                
                return (
                  <div 
                    key={f.id}
                    id={`file_card_${f.id}`}
                    onClick={() => setSelectedFile(f)}
                    className="flex flex-col rounded-xl bg-slate-950 border border-slate-850 overflow-hidden hover:border-indigo-500/50 hover:shadow-lg transition-all group cursor-pointer"
                  >
                    {/* Fake Visual Placeholder preview for multimedia items */}
                    <div className="aspect-video bg-slate-900 border-b border-slate-850/80 relative flex items-center justify-center overflow-hidden">
                      {f.mimetype.startsWith("video/") && (
                        <div className="absolute inset-0 bg-slate-950/20 flex items-center justify-center transition-all group-hover:scale-105">
                          <Film className="absolute top-3 left-3 text-sky-400 opacity-60" size={16} />
                          <div className="h-12 w-12 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all">
                            <Play size={20} className="ml-1" />
                          </div>
                        </div>
                      )}

                      {f.mimetype.startsWith("image/") && (
                        <div className="absolute inset-0 transition-all group-hover:scale-105">
                          <img 
                            src={`/uploads/files/${f.filename}`} 
                            referrerPolicy="no-referrer"
                            alt={f.originalName} 
                            className="h-full w-full object-cover opacity-85 hover:opacity-100"
                          />
                          <ImageIcon className="absolute top-3 left-3 text-rose-400 drop-shadow" size={16} />
                        </div>
                      )}

                      {(f.mimetype.includes("presentation") || f.mimetype.includes("powerpoint") || f.originalName.endsWith(".pptx") || f.originalName.endsWith(".ppt")) && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-teal-950 to-indigo-950 flex flex-col p-3 justify-between transition-all group-hover:scale-105">
                          <Presentation className="text-teal-400" size={18} />
                          <div className="text-center font-bold tracking-tight text-slate-100 text-xs font-mono select-none">
                            PPT COMPATÍVEL
                          </div>
                          <span className="text-[9px] text-right text-teal-300/60 font-mono">Ver Apresentação</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata summary info */}
                    <div className="p-4 flex flex-col justify-between flex-grow gap-3">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {getFileIcon(f.mimetype, f.originalName)}
                            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono truncate">{category}</span>
                          </div>
                          <span className="text-[8px] shrink-0 bg-slate-900 border border-slate-800 text-teal-300 font-bold uppercase px-1.5 py-0.5 rounded-md font-sans">
                            {f.setor || "Geral"}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-200 truncate group-hover:text-indigo-400 transition-colors">
                          {f.originalName}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-900 pt-2.5">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(f.uploadedAt).toLocaleDateString()}
                        </span>
                        <span>{(f.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                        <span className="flex items-center gap-0.5 text-slate-400">
                          <Eye size={10} />
                          {f.views}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Dynamic Overlay Unified Player */}
      {selectedFile && (
        <UnifiedPlayer 
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          username={session.username}
          role={session.role}
          onViewLogged={handleRefresh}
        />
      )}

      {/* Basic Footer */}
      <footer className="bg-slate-950 py-4 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Portal de Mídia Integrado. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
