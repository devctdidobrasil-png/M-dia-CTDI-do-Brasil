import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Search, Film, Image as ImageIcon, Presentation, 
  Clock, LogOut, Trash2, Database, CloudUpload, Shield, RefreshCw
} from "lucide-react";
import { FileRecord, AuthSession } from "../types";
import UnifiedPlayer from "./UnifiedPlayer";

interface UploaderDashboardProps {
  session: AuthSession;
  onLogout: () => void;
}

export default function UploaderDashboard({ session, onLogout }: UploaderDashboardProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "video" | "image" | "ppt">("all");

  // Selection state for preview player
  const [selectedFileForPlayer, setSelectedFileForPlayer] = useState<FileRecord | null>(null);

  // Upload file states
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [uploadFileSetor, setUploadFileSetor] = useState(session.setor || "Geral");
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all files to display "My Uploads" list
  const fetchMyFiles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/files");
      const data = await res.json();
      // Show only files uploaded by this user, OR files belonging to their sector
      const filtered = data.filter((f: FileRecord) => 
        f.uploadedBy.toLowerCase() === session.username.toLowerCase() || 
        (f.setor && f.setor.toLowerCase() === (session.setor || "Geral").toLowerCase())
      );
      setFiles(filtered);
      setLoading(false);
    } catch (err) {
      console.error("Erro lendo arquivos do uploader:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyFiles();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Drag and Drop hooks
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
      setUploadError("Formato inválido. Por favor, envie apenas vídeos (MP4, WEBM), fotos (PNG, JPG, WEBP) ou PowerPoint.");
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
        setUploadSuccess(`Sucesso! '${selectedFileForUpload.name}' foi salvo no setor '${data.setor || 'Geral'}' com sucesso.`);
        setSelectedFileForUpload(null);
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

  const handleDeleteFile = async (fileRecord: FileRecord) => {
    if (!window.confirm(`Deseja mesmo excluir o arquivo '${fileRecord.originalName}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/files/${fileRecord.id}?deletedBy=${session.username}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Não foi possível apagar o arquivo.");
        return;
      }

      handleRefresh();
    } catch (err) {
      console.error(err);
      alert("Houve um problema de rede ao excluir o arquivo.");
    }
  };

  // Filter list
  const filteredFiles = files.filter(f => {
    const matchesSearch = f.originalName.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === "all") return true;
    
    const isVideo = f.mimetype.startsWith("video/");
    const isImage = f.mimetype.startsWith("image/");
    const isPpt = f.originalName.endsWith(".ppt") || f.originalName.endsWith(".pptx") || f.originalName.endsWith(".pps") || f.originalName.endsWith(".ppsx");

    if (activeTab === "video") return isVideo;
    if (activeTab === "image") return isImage;
    if (activeTab === "ppt") return isPpt;
    return true;
  });

  const getFileCategoryLabel = (mimetype: string, name: string) => {
    if (mimetype.startsWith("video/")) return "Vídeo";
    if (mimetype.startsWith("image/")) return "Foto";
    if (name.endsWith(".ppt") || name.endsWith(".pptx") || name.endsWith(".pps") || name.endsWith(".ppsx")) return "Apresentação";
    return "Mídia";
  };

  return (
    <div id="uploader_dashboard" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Dynamic Navigation Toolbar header */}
      <header className="bg-slate-950/80 backdrop-blur border-b border-slate-850 px-4 py-3 sm:px-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-700 text-slate-900 rounded-xl shadow-lg shadow-amber-500/10">
              <CloudUpload size={20} className="text-white" />
            </span>
            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                Portal Multimídia <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-bold">Uploader</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest hidden sm:block">Painel de Envio Dedicado</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden xs:block">
              <p className="text-xs font-semibold text-slate-200">{session.username}</p>
              <p className="text-[9px] text-slate-500 flex items-center gap-1 justify-end font-mono">
                <Shield size={10} className="text-amber-400" /> Setor: {session.setor || "Geral"}
              </p>
            </div>

            <button 
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 hover:border-slate-700 transition-all text-xs flex items-center gap-1.5 cursor-pointer font-medium focus:outline-none"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Desconectar</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main page context layout container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Banner Section */}
        <section className="bg-gradient-to-br from-slate-950 via-slate-950 to-indigo-950/40 p-6 rounded-2xl border border-slate-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Upload de Vídeos e Slides</h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Bem-vindo ao Portal de Mídia. Seu usuário possui nível exclusivo para registrar novos arquivos para o painel de exibição. Arquivos carregados ficam disponíveis imediatamente para o seu setor (<span className="text-amber-400 font-semibold">{session.setor || "Geral"}</span>).
            </p>
          </div>
          <button 
            onClick={handleRefresh}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw size={15} />
          </button>
        </section>

        {/* UPLOAD FORM SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* CARREGADOR FILE UPLOADER (8 columns) */}
          <div className="lg:col-span-8 flex flex-col gap-4 rounded-xl bg-slate-950 border border-slate-850 p-5 sm:p-6 shadow-md">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CloudUpload className="text-amber-400" size={18} />
                Carregador Integrado de Mídia
              </h3>
              <p className="text-xs text-slate-400 mt-1">
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
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative min-h-48 ${
                dragActive 
                  ? 'border-amber-400 bg-amber-500/5' 
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
              
              <CloudUpload size={38} className={`mb-3 ${dragActive ? 'text-amber-400' : 'text-slate-500'}`} />
              
              {selectedFileForUpload ? (
                <div className="truncate max-w-full px-4 select-all" onClick={e => e.stopPropagation()}>
                  <p className="text-sm font-semibold text-amber-400 truncate">{selectedFileForUpload.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{(selectedFileForUpload.size / (1024 * 1024)).toFixed(2)} MB</p>
                  <p className="text-[10px] text-indigo-400 mt-1 bg-indigo-500/10 px-2 py-0.5 rounded-full inline-block">Mídia selecionada</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-300">
                    Arraste o arquivo ou <span className="text-amber-400 underline font-medium">clique para procurar</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2">Vídeo, Imagem ou PowerPoint (Máx. 3GB)</p>
                </div>
              )}
            </div>

            {/* Setor de Destino */}
            <div className="flex flex-col gap-1.5 bg-slate-900/60 p-4 rounded-lg border border-slate-850">
              <label className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
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
                  className="flex-1 bg-slate-950 text-slate-200 px-3 py-2 text-xs border border-slate-800 focus:border-amber-500 rounded-lg outline-none cursor-pointer"
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
                    className="w-1/2 bg-slate-950 text-slate-200 px-3 py-2 text-xs border border-slate-800 focus:border-amber-500 rounded-lg outline-none"
                  />
                )}
              </div>
            </div>

            {/* Feedback messages */}
            {uploadError && (
              <div className="rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 px-3 py-2.5 text-xs font-medium">
                {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-2.5 text-xs font-medium">
                {uploadSuccess}
              </div>
            )}

            {/* Upload Button Progress bar */}
            {isUploading ? (
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Enviando arquivo e processando os metadados...</span>
                  <span className="font-mono font-bold text-amber-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-400 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : (
              <button 
                onClick={handleUploadSubmit}
                disabled={!selectedFileForUpload}
                className="w-full mt-2 py-2.5 px-4 rounded-xl font-semibold text-slate-950 bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 hover:bg-amber-300 transition-colors text-xs flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer"
              >
                <CloudUpload size={15} />
                <span>Salvar no Banco de Dados</span>
              </button>
            )}
          </div>

          {/* HELP INFO SIDE PANEL (4 columns) */}
          <div className="lg:col-span-4 flex flex-col gap-4 rounded-xl bg-slate-950 border border-slate-850 p-5 sm:p-6 shadow-md justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Database className="text-amber-400" size={16} />
                  Informações de Registro
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Arquivos salvos aqui são adicionados ao armazenamento interno persistente e indexados para os painéis de visualização.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg flex gap-2">
                  <span className="text-amber-400 text-xs font-mono select-all shrink-0">01</span>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    Selecione arquivos de vídeo, imagem ou slides no painel esquerdo.
                  </p>
                </div>
                
                <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg flex gap-2">
                  <span className="text-amber-400 text-xs font-mono select-all shrink-0">02</span>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    Configure para qual setor o arquivo deve ser destinado. Por padrão é para o seu setor <b>{session.setor || "Geral"}</b>.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg flex gap-2">
                  <span className="text-amber-400 text-xs font-mono select-all shrink-0">03</span>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    Os vídeos suportam até <b>3 Gigabytes</b>. O portal indexa automaticamente os mimetypes para um player visual impecável.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-850 text-center text-[10px] text-slate-500 font-mono">
              SISTEMA DE TRANSFERÊNCIA DE LARGURA DE BANDA COMPLETA
            </div>
          </div>

        </section>

        {/* GALLERIA / HISTORY DETAILS LIST */}
        <section className="space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Meus Envios & Mídias do Setor</h3>
              <p className="text-xs text-slate-400 mt-1">
                Visualização filtrada das mídias enviadas por você ou destinadas ao setor <b>{session.setor || "Geral"}</b>.
              </p>
            </div>

            {/* Filter controls tabs and search bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex border border-slate-800 bg-slate-950 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeTab === "all" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setActiveTab("video")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeTab === "video" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Vídeos
                </button>
                <button
                  onClick={() => setActiveTab("image")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeTab === "image" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Fotos
                </button>
                <button
                  onClick={() => setActiveTab("ppt")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeTab === "ppt" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Slides
                </button>
              </div>

              <div className="relative">
                <input 
                  type="text"
                  placeholder="Buscar mídia..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-slate-950 text-slate-200 pl-8 pr-3 py-1.5 border border-slate-800 rounded-lg outline-none text-xs focus:border-amber-500 w-44"
                />
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-950 rounded-xl border border-slate-850">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-400 mb-2" />
              <p className="text-xs text-slate-450 font-mono">Lendo banco de mídias corporativas...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-950 rounded-xl border border-slate-850 text-slate-500">
              <CloudUpload size={24} className="mb-2 text-slate-600" />
              <p className="text-xs">Nenhum arquivo enviado ou correspondente à busca neste setor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredFiles.map(f => {
                const isVideo = f.mimetype.startsWith("video/");
                const isImage = f.mimetype.startsWith("image/");
                const category = getFileCategoryLabel(f.mimetype, f.originalName);

                return (
                  <div key={f.id} className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-slate-950 border border-slate-850/80 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-950/20 transition-all">
                    
                    {/* Visual Media Thumbnail Cover Placeholder */}
                    <div className="aspect-video w-full bg-slate-900 border-b border-slate-850 relative flex items-center justify-center overflow-hidden">
                      {isImage ? (
                        <img 
                          src={`/uploads/files/${f.filename}`} 
                          alt={f.originalName}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      ) : isVideo ? (
                        <video 
                          src={`/uploads/files/${f.filename}`}
                          className="h-full w-full object-cover opacity-70 group-hover:opacity-90"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <Presentation size={36} className="text-amber-500/30" />
                      )}

                      {/* Play Hover Trigger Overlay */}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <button 
                          onClick={() => setSelectedFileForPlayer(f)}
                          className="p-2 sm:p-2.5 rounded-full bg-amber-400 text-slate-950 shadow-lg cursor-pointer transform scale-75 group-hover:scale-100 transition-all font-semibold"
                          title="Visualizar mídia corporativa"
                        >
                          <Play size={14} fill="currentColor" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Box description card */}
                    <div className="p-3.5 flex flex-col justify-between gap-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">{category}</span>
                          <span className="text-[8px] bg-slate-900 border border-slate-850 text-amber-400 px-1.5 py-0.2 rounded font-sans uppercase font-bold tracking-wide">
                            {f.setor || "Geral"}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-200 truncate pr-5 group-hover:text-amber-400 transition-colors" title={f.originalName}>
                          {f.originalName}
                        </h4>
                        
                        <p className="text-[9px] text-slate-500 mt-1 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>Por: <span className="text-slate-400">{f.uploadedBy}</span></span>
                          <span className="h-1 w-1 rounded-full bg-slate-800 shrink-0" />
                          <span>{(f.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                        </p>
                      </div>

                      {/* Control buttons inside media card */}
                      <div className="flex items-center justify-between border-t border-slate-900 pt-2 text-[10px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(f.uploadedAt).toLocaleDateString("pt-BR")}
                        </span>

                        {/* Allowed to delete files they uploaded */}
                        {f.uploadedBy.toLowerCase() === session.username.toLowerCase() && (
                          <button 
                            onClick={() => handleDeleteFile(f)}
                            className="p-1 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                            title="Apagar minha mídia"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </section>

      </main>

      {/* Embedded preview modal screen */}
      {selectedFileForPlayer && (
        <UnifiedPlayer 
          file={selectedFileForPlayer} 
          onClose={() => setSelectedFileForPlayer(null)} 
          username={session.username}
          role={session.role}
          onViewLogged={handleRefresh}
        />
      )}

      {/* footer details */}
      <footer className="bg-slate-950 border-t border-slate-850 py-4 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-slate-500 text-[10px] sm:text-xs">
          © {new Date().getFullYear()} Portal Multimídia Corporativo • Canal de Carregamento Independente
        </div>
      </footer>

    </div>
  );
}
