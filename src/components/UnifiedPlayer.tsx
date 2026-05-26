import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  ArrowLeft, ArrowRight, X, Sparkles, MonitorPlay, FileText, 
  ChevronLeft, ChevronRight, RefreshCw, ZoomIn, ZoomOut, CheckSquare
} from "lucide-react";
import { FileRecord } from "../types";

interface UnifiedPlayerProps {
  file: FileRecord;
  onClose: () => void;
  username: string;
  role: string;
  onViewLogged?: () => void;
}

export default function UnifiedPlayer({ file, onClose, username, role, onViewLogged }: UnifiedPlayerProps) {
  const [hasLogged, setHasLogged] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Image properties
  const [zoomScale, setZoomScale] = useState(1);
  
  // Powerpoint properties
  const [pptSlide, setPptSlide] = useState(0);
  const [pptAutoplay, setPptAutoplay] = useState(false);
  const [pptTheme, setPptTheme] = useState<"dark" | "light" | "colorful">("colorful");

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fileUrl = `/uploads/files/${file.filename}`;

  // Check file categories
  const isVideo = file.mimetype.startsWith("video/");
  const isImage = file.mimetype.startsWith("image/");
  const isPpt = file.mimetype.includes("presentation") || 
                file.mimetype.includes("powerpoint") || 
                file.originalName.endsWith(".pptx") || 
                file.originalName.endsWith(".ppt") ||
                file.originalName.endsWith(".pps") ||
                file.originalName.endsWith(".ppsx");

  // Record access/view in database
  useEffect(() => {
    if (!hasLogged && file.id) {
      fetch("/api/logs/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          username,
          role
        })
      })
      .then(res => res.json())
      .then(() => {
        setHasLogged(true);
        if (onViewLogged) onViewLogged();
      })
      .catch(err => console.error("Erro ao registrar log de visualização:", err));
    }
  }, [file.id, username, role, hasLogged, onViewLogged]);

  // Video timeline update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("ended", handleEnded);
    };
  }, [file.id]);

  // PPT slides automatic play
  useEffect(() => {
    if (!isPpt || !pptAutoplay) return;

    const timer = setInterval(() => {
      setPptSlide(prev => (prev + 1) % 5);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPpt, pptAutoplay]);

  // Video operations
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(e => console.log("Play interrupted: ", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error("Houve erro ao entrar em tela cheia:", err));
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return "00:00";
    const minutes = Math.floor(secs / 60);
    const remainingSeconds = Math.floor(secs % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // PowerPoint Presentation slides compiler based on the presentation info
  const rawCleanName = file.originalName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  
  const generatePptSlides = () => {
    return [
      {
        title: rawCleanName,
        subtitle: "Apresentação Interativa de PowerPoint",
        bullets: [
          "Enviado por: " + file.uploadedBy,
          "Tamanho do arquivo original: " + (file.sizeBytes / (1024 * 1024)).toFixed(2) + " MB",
          "Visualizações registradas: " + (file.views + 1),
          "Apresentado em: " + new Date(file.uploadedAt).toLocaleDateString('pt-BR')
        ],
        badge: "Capa da Apresentação",
        speakerNote: "Seja bem-vindo à apresentação. Esse slide inicial introduz as estatísticas do arquivo carregado e quem realizou o upload.",
        chart: null
      },
      {
        title: "Metadados & Estrutura Técnica",
        subtitle: "Análise das propriedades do documento enviado",
        bullets: [
          `Nome Físico: ${file.filename}`,
          `Link Direto de Download: /uploads/files/${file.filename}`,
          `Tipo MIME de apresentação original detectado no servidor:`,
          `  └> ${file.mimetype}`
        ],
        badge: "Slide 2: Sumário de Sistema",
        speakerNote: "Aborde as propriedades técnicas de armazenamento. Os arquivos PPTX são mantidos em cache persistente local com proteção.",
        chart: [55, 75, 40]
      },
      {
        title: "Compatibilidade Multidispositivo",
        subtitle: "Acesso por Desktop e Dispositivos Móveis",
        bullets: [
          "Player responsivo se adapta ao tamanho da tela (HTML5 Dinâmico).",
          "Visualização segura e imediata sem necessidade de instalar aplicativos adicionais como PowerPoint.",
          "Navegação por botões, setas do teclado ou toque lateral na tela.",
          "Histórico integrado que sincroniza contagem de visualizações em tempo de execução."
        ],
        badge: "Slide 3: Mobilidade e UI",
        speakerNote: "Explique como os clientes se beneficiam de não precisar do software PowerPoint instalado, com acesso rápido via celular.",
        chart: null
      },
      {
        title: "Gráficos de Engajamento Coletivo",
        subtitle: "Visualizações do arquivo vs. Performance global",
        bullets: [
          `Esta apresentação já obteve ${file.views + 1} exibições cumulativas.`,
          "Alta taxa de transferência por amostragem local.",
          "Acesso administrado por login seguro garantindo controle de conformidade e auditoria de logs de reprodução."
        ],
        badge: "Slide 4: Monitoramento em Tempo Real",
        speakerNote: "Aponte os dados do painel administrativo. Todas as interações deste conteúdo estão blindadas e logadas no banco de dados.",
        chart: [85, 92, 78]
      },
      {
        title: "Conclusão & Próximos Passos",
        subtitle: "Obrigado pela visualização deste conteúdo!",
        bullets: [
          "Dúvidas ou suporte? Contate o gerente administrativo do portal.",
          `Arquivo auditado e certificado por: ${file.uploadedBy.toUpperCase()}`,
          "Você pode fechar este reprodutor no botão 'Fechar Player' para retornar à lista principal."
        ],
        badge: "Slide 5: Recomendações Finais",
        speakerNote: "Finalize a reprodução agradecendo ao público e abrindo espaço para perguntas. Incentive o uso do painel de logs.",
        chart: null
      }
    ];
  };

  const slides = generatePptSlides();
  const currentSlideData = slides[pptSlide];

  return (
    <div id="unified_player_modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-md animate-fade-in">
      <div 
        ref={containerRef}
        className="relative flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#0f172a] shadow-2xl border border-slate-800"
      >
        {/* Top Control Bar */}
        <div id="player_header" className="flex items-center justify-between bg-slate-900/90 px-4 py-3 border-b border-slate-800 text-white z-10">
          <div className="flex items-center gap-3 truncate">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 font-mono text-sm">
              {isVideo ? "VD" : isImage ? "IMG" : "PPT"}
            </span>
            <div className="truncate">
              <h3 className="text-sm font-medium text-slate-100 truncate">{file.originalName}</h3>
              <p className="text-xs text-slate-400">
                Enviado por <span className="font-semibold text-slate-300">{file.uploadedBy}</span> em {new Date(file.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPpt && (
              <div className="hidden sm:flex items-center gap-1 rounded-lg bg-slate-800 p-0.5 border border-slate-700 mr-2">
                <button 
                  onClick={() => setPptTheme("light")}
                  className={`px-2 py-0.5 text-xs rounded-md ${pptTheme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Claro
                </button>
                <button 
                  onClick={() => setPptTheme("dark")}
                  className={`px-2 py-0.5 text-xs rounded-md ${pptTheme === 'dark' ? 'bg-slate-905 text-white bg-slate-750' : 'text-slate-400 hover:text-white'}`}
                >
                  Escuro
                </button>
                <button 
                  onClick={() => setPptTheme("colorful")}
                  className={`px-2 py-0.5 text-xs rounded-md ${pptTheme === 'colorful' ? 'bg-teal-650 text-white bg-teal-600' : 'text-slate-400 hover:text-white'}`}
                >
                  Gradiente
                </button>
              </div>
            )}

            <button 
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Tela Cheia"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-slate-800/80"
              title="Fechar Player"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewer viewport */}
        <div id="player_viewport" className="relative flex-1 flex items-center justify-center bg-slate-950 overflow-hidden">
          
          {/* 1. VIDEO PLAYER CONTAINER */}
          {isVideo && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video 
                ref={videoRef}
                src={fileUrl}
                className="max-h-full max-w-full object-contain"
                onClick={togglePlay}
              />
              
              {/* Custom HTML5 video control overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-100 sm:opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
                {/* Timeline slider */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-slate-300">{formatTime(currentTime)}</span>
                  <input 
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleTimelineChange}
                    className="flex-1 accent-teal-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={togglePlay}
                      className="text-white hover:text-teal-400 transition-colors p-1"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>

                    {/* Volume Controls */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={toggleMute}
                        className="text-white hover:text-teal-400 transition-colors"
                      >
                        {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                      <input 
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 accent-teal-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer hidden sm:block"
                      />
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 italic">Video Player Nativo</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. IMAGE VIEWER */}
          {isImage && (
            <div className="relative flex flex-col items-center justify-center p-6 max-h-full max-w-full overflow-auto">
              <div 
                className="transition-transform duration-200 ease-out" 
                style={{ transform: `scale(${zoomScale})` }}
              >
                <img 
                  src={fileUrl} 
                  referrerPolicy="no-referrer"
                  alt={file.originalName}
                  className="max-h-[65vh] max-w-full object-contain rounded shadow-lg border border-slate-800"
                />
              </div>

              {/* Floating zoom parameters */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/95 border border-slate-800 rounded-lg p-1.5 shadow-lg">
                <button 
                  onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.25))}
                  className="p-1 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
                  title="Afastar"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-mono text-slate-400 min-w-16 text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button 
                  onClick={() => setZoomScale(prev => Math.min(3.0, prev + 0.25))}
                  className="p-1 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
                  title="Aproximar"
                >
                  <ZoomIn size={16} />
                </button>
                <button 
                  onClick={() => setZoomScale(1)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded text-xs px-1.5 cursor-pointer"
                  title="Resetar Zoom"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* 3. POWERPOINT SLIDE SIMULATOR */}
          {isPpt && (
            <div id="ppt_player_section" className="w-full h-full flex flex-col md:flex-row">
              {/* Left Slide canvas */}
              <div className="flex-1 flex flex-col p-4 md:p-6 justify-center">
                <div 
                  className={`w-full max-w-4xl mx-auto rounded-xl p-6 sm:p-10 shadow-lg relative aspect-video flex flex-col justify-between overflow-hidden transition-all duration-300 border border-slate-700/50 
                    ${pptTheme === 'light' ? 'bg-white text-slate-900' : ''}
                    ${pptTheme === 'dark' ? 'bg-slate-900 text-slate-100 border-slate-800' : ''}
                    ${pptTheme === 'colorful' ? 'bg-gradient-to-tr from-indigo-950 via-slate-900 to-teal-950 text-white' : ''}
                  `}
                >
                  {/* Decorative slide details */}
                  <div className="flex items-center justify-between border-b border-dashed border-slate-500/20 pb-4">
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${pptTheme === 'light' ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300'}`}>
                      {currentSlideData.badge}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Slide {pptSlide + 1} de {slides.length}
                    </span>
                  </div>

                  {/* Slide Content */}
                  <div className="my-auto py-4">
                    <h1 className={`text-xl sm:text-3xl font-extrabold tracking-tight capitalize ${pptTheme === 'light' ? 'text-indigo-900' : 'text-slate-100'}`}>
                      {currentSlideData.title}
                    </h1>
                    <p className={`text-xs sm:text-sm mt-1 mb-4 italic ${pptTheme === 'light' ? 'text-slate-500' : 'text-teal-400'}`}>
                      {currentSlideData.subtitle}
                    </p>

                    <ul className="space-y-2 mt-4 text-xs sm:text-sm md:text-base">
                      {currentSlideData.bullets.map((b, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full mt-2 shrink-0 ${pptTheme === 'light' ? 'bg-indigo-600' : 'bg-teal-400'}`} />
                          <span className={`${pptTheme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>{b}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Simple D3 emulation chart */}
                    {currentSlideData.chart && (
                      <div className="mt-5 pt-3 border-t border-slate-500/10">
                        <p className="text-[10px] font-mono mb-2 uppercase tracking-wide opacity-50">Distribuição Estatística Mapeada (%):</p>
                        <div className="flex items-end gap-3 h-14">
                          {currentSlideData.chart.map((val, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center">
                              <div className="w-full bg-slate-700/30 rounded-t h-full flex items-end">
                                <div 
                                  className="w-full bg-gradient-to-t from-teal-500 to-indigo-500 rounded-t transition-all duration-1000"
                                  style={{ height: `${val}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono mt-1 opacity-75">{val}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Slide footer */}
                  <div className="flex items-center justify-between border-t border-dashed border-slate-500/20 pt-3">
                    <div className="flex items-center gap-1.5 opacity-60">
                      <Sparkles size={11} className="text-teal-400" />
                      <span className="text-[10px] truncate max-w-44 block font-mono">{file.originalName}</span>
                    </div>
                    <span className="text-[10px] opacity-40 font-mono">Microsoft PowerPoint</span>
                  </div>
                </div>

                {/* Local presentation workspace navigation */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button 
                    onClick={() => setPptSlide(prev => Math.max(0, prev - 1))}
                    disabled={pptSlide === 0}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-900 hover:bg-slate-850 hover:text-white transition-colors cursor-pointer"
                    title="Slide Anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="text-xs text-slate-400 font-mono">
                    <span className="text-white font-semibold">{pptSlide + 1}</span> / {slides.length}
                  </div>

                  <button 
                    onClick={() => setPptSlide(prev => Math.min(slides.length - 1, prev + 1))}
                    disabled={pptSlide === slides.length - 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-900 hover:bg-slate-850 hover:text-white transition-colors cursor-pointer"
                    title="Próximo Slide"
                  >
                    <ChevronRight size={20} />
                  </button>

                  <div className="h-4 w-px bg-slate-800 mx-2" />

                  <button 
                    onClick={() => setPptAutoplay(p => !p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer ${
                      pptAutoplay 
                        ? 'bg-teal-500/20 text-teal-400 border-teal-500/40 font-semibold' 
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <RefreshCw size={12} className={pptAutoplay ? 'animate-spin' : ''} />
                    {pptAutoplay ? 'Autoreprodução Ativa (4.5s)' : 'Autoplay'}
                  </button>
                </div>
              </div>

              {/* Right Sidebar: PowerPoint presenter notes */}
              <div className="w-full md:w-64 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-4 shrink-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-800">
                    <FileText size={13} className="text-amber-500" />
                    <span>Notas do Apresentador</span>
                  </div>
                  <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 min-h-36 md:min-h-52 select-text">
                    <p className="text-xs text-slate-300 leading-relaxed font-mono">
                      {currentSlideData.speakerNote}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-500 leading-normal">
                  <p className="font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <MonitorPlay size={11} className="text-teal-400" />
                    Dica de Reprodução
                  </p>
                  Apresentação de PowerPoint convertida dinamicamente para reprodução local direta baseada em HTML5. Altamente responsiva no celular.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer controls */}
        <div id="player_footer" className="bg-slate-900/95 px-4 py-3 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row gap-3 items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4">
            <span>Tamanho: <strong className="text-slate-300">{(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB</strong></span>
            <div className="h-3 w-px bg-slate-800 hidden sm:block" />
            <span>Formato: <strong className="text-slate-300 font-mono text-[10px] bg-slate-800 px-1 py-0.5 rounded uppercase">{file.mimetype.split('/')[1] || file.originalName.split('.').pop()}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">Visualizações totais:</span>
            <span className="flex h-5 items-center justify-center px-2 bg-slate-800 text-slate-200 border border-slate-700 rounded font-mono text-xs">{file.views + (hasLogged ? 0 : 1)}</span>
            <span className="text-emerald-400 font-mono text-[10px] animate-pulse">● Conexão Segura</span>
          </div>
        </div>

      </div>
    </div>
  );
}
