import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Sparkles, 
  Plus, 
  X, 
  Mic, 
  Camera, 
  Layers, 
  Zap, 
  Coffee, 
  ExternalLink, 
  Clock, 
  ArrowUpRight, 
  Globe, 
  RefreshCw, 
  AlertCircle, 
  Trash2, 
  Settings2, 
  ChevronRight,
  BookOpen,
  HelpCircle,
  ThumbsUp,
  Heart
} from "lucide-react";

// Strictly specified TypeScript interface corresponding to actual API response
interface RealSearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
  wordcount: number;
  timestamp: string;
  source: string;
}

interface CustomShortcut {
  id: string;
  name: string;
  query: string;
  icon: string;
  badge: string;
  colorClass: string;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [results, setResults] = useState<RealSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Configuration States
  const [searchLang, setSearchLang] = useState<"ko" | "en">("ko");
  const [resultLimit, setResultLimit] = useState<number>(12);
  const [selectedBgTheme, setSelectedBgTheme] = useState<string>("dark-black");
  const [safeSearchFilter, setSafeSearchFilter] = useState<boolean>(true);
  const [activePersona, setActivePersona] = useState<string>("agent-grumpy");

  // Local storage friendly past search history
  const [pastQueries, setPastQueries] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("vibefind_history");
      return saved ? JSON.parse(saved) : ["React.js", "우주 정거장", "고양이", "인공지능"];
    } catch {
      return ["React.js", "우주 정거장", "고양이", "인공지능"];
    }
  });

  // Hot quick shortcuts dataset which directly triggers non-mock real-time search 
  const [shortcuts, setShortcuts] = useState<CustomShortcut[]>([
    { id: "sc-1", name: "리액트", query: "React.js", icon: "⚛️", badge: "FW", colorClass: "from-cyan-500 to-blue-600" },
    { id: "sc-2", name: "고양이과 동물", query: "고양이", icon: "🐱", badge: "PET", colorClass: "from-amber-400 to-orange-500" },
    { id: "sc-3", name: "블랙홀 과학", query: "블랙홀", icon: "🕳️", badge: "ASTRO", colorClass: "from-purple-500 to-indigo-600" },
    { id: "sc-4", name: "ChatGPT 혁명", query: "ChatGPT", icon: "🧠", badge: "AI", colorClass: "from-emerald-500 to-teal-600" },
    { id: "sc-5", name: "대한민국 역사", query: "대한민국", icon: "🇰🇷", badge: "HIST", colorClass: "from-rose-500 to-pink-600" },
    { id: "sc-6", name: "양자역학", query: "양자역학", icon: "🌌", badge: "PHYS", colorClass: "from-slate-600 to-slate-800" }
  ]);

  // Modal to add user custom keyword shortcut
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newShortcutName, setNewShortcutName] = useState("");
  const [newShortcutQuery, setNewShortcutQuery] = useState("");
  const [newShortcutIcon, setNewShortcutIcon] = useState("💡");

  // Global Interactive Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);

  const triggerToast = (msg: string) => {
    if (toastTimer) clearTimeout(toastTimer);
    setToastMessage(msg);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
    setToastTimer(timer);
  };

  // Safe search query validation helper
  const cleanSearchQuery = (term: string) => {
    let cleaned = term.trim();
    if (safeSearchFilter) {
      // Exclude simple hazardous or irrelevant symbol spam
      cleaned = cleaned.replace(/[{}\[\]()<>]/g, "");
    }
    return cleaned;
  };

  // PRIMARY NON-MOCK REAL-TIME ASYNC SEARCH ENGINE FUNCTION
  const executeRealSearch = async (term: string) => {
    const targetQuery = cleanSearchQuery(term);
    if (!targetQuery) {
      triggerToast("⚠️ 유효한 검색어를 기재해 주십시오.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setActiveQuery(targetQuery);
    setHasSearched(true);

    try {
      // Fetch via our newly declared Express server proxy to avoid cross-origin constraints (CORS) perfectly
      const encodedQuery = encodeURIComponent(targetQuery);
      const url = `/api/search?q=${encodedQuery}&lang=${searchLang}&limit=${resultLimit}`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`서버 가스 파이프 제한 혹은 네트워크 오류 (${res.status})`);
      }

      const data = await res.json();
      const fetchedResults = data.results || [];
      
      setResults(fetchedResults);

      // Append search history if not duplicate, limit to max 8 items
      setPastQueries(prev => {
        const filtered = prev.filter(q => q.toLowerCase() !== targetQuery.toLowerCase());
        const updated = [targetQuery, ...filtered].slice(0, 8);
        localStorage.setItem("vibefind_history", JSON.stringify(updated));
        return updated;
      });

      if (fetchedResults.length > 0) {
        triggerToast(`✨ [${targetQuery}] 검색 결과 ${fetchedResults.length}건을 성공적으로 공수했습니다!`);
      } else {
        triggerToast(`ℹ️ [${targetQuery}] 키워드에 대한 실시간 결과가 없습니다.`);
      }

    } catch (err: any) {
      console.error("Search fetch crash:", err);
      // Fallback directly to client-side CORS-enabled JSONP or origin=* endpoint if Express proxy experiences any local delay
      try {
        console.warn("Express proxy failed/unreachable. Attempting pure client-side direct Wikipedia origin bypass...");
        const clientDirectUrl = `https://${searchLang}.wikipedia.org/w/api.php?action=query&list=search&utf8=1&format=json&origin=*&srlimit=${resultLimit}&srsearch=${encodeURIComponent(targetQuery)}`;
        
        const directRes = await fetch(clientDirectUrl);
        if (!directRes.ok) throw new Error("Client Direct Wiki API query also failed");

        const directData = await directRes.json();
        const directArticles = directData?.query?.search || [];
        
        const mappedDirect = directArticles.map((art: any) => ({
          id: `wiki-direct-${art.pageid}`,
          title: art.title,
          snippet: art.snippet ? art.snippet.replace(/<\/?[^>]+(>|$)/g, "") : "요약문 부재",
          url: `https://${searchLang}.wikipedia.org/wiki/${encodeURIComponent(art.title)}`,
          wordcount: art.wordcount || 0,
          timestamp: art.timestamp || new Date().toISOString(),
          source: searchLang === "ko" ? "위키백과 (Direct Client Bypass)" : "Wikipedia En (Direct Client Bypass)"
        }));

        setResults(mappedDirect);
        if (mappedDirect.length > 0) {
          triggerToast(`⚡ direct fallback 기동 - 위키백과 정보 공수 완료!`);
        } else {
          setError("검색 결과가 부재합니다. 다른 동적 한국어/영어 키워드를 시도해 주십시오.");
        }
      } catch (fallbackErr: any) {
        setError(`실시간 검색 결과를 불러오는 데 실패했습니다: ${err.message || err}`);
        triggerToast("❌ 검색 연결 실패! 네트워크 상태를 판별 중입니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      triggerToast("⚠️ 검색어를 먼저 기재해 주세요!");
      return;
    }
    executeRealSearch(searchQuery);
  };

  const handleShortcutClick = (query: string) => {
    setSearchQuery(query);
    executeRealSearch(query);
  };

  const clearHistory = () => {
    setPastQueries([]);
    localStorage.removeItem("vibefind_history");
    triggerToast("🗑️ 검색 기록 리스트가 리셋되었습니다.");
  };

  const removeHistoryItem = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = pastQueries.filter(q => q !== term);
    setPastQueries(updated);
    localStorage.setItem("vibefind_history", JSON.stringify(updated));
    triggerToast(`🗑️ '${term}' 기록이 제거되었습니다.`);
  };

  const handleCreateShortcut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcutName.trim() || !newShortcutQuery.trim()) {
      triggerToast("⚠️ 숏컷 이름과 검색할 단어를 완벽히 입력해 주세요.");
      return;
    }

    const randomColors = [
      "from-rose-500 to-pink-600",
      "from-cyan-500 to-blue-600",
      "from-amber-400 to-orange-500",
      "from-purple-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-fuchsia-500 to-pink-600"
    ];
    const borderCol = randomColors[Math.floor(Math.random() * randomColors.length)];

    const item: CustomShortcut = {
      id: `custom-sc-${Date.now()}`,
      name: newShortcutName,
      query: newShortcutQuery,
      icon: newShortcutIcon || "💡",
      badge: "USER",
      colorClass: borderCol
    };

    setShortcuts(prev => [...prev, item]);
    setIsModalOpen(false);
    setNewShortcutName("");
    setNewShortcutQuery("");
    triggerToast(`🌟 [${newShortcutName}] 바로가기 단추가 배포창에 완수되었습니다.`);
  };

  const deleteShortcut = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShortcuts(prev => prev.filter(sc => sc.id !== id));
    triggerToast("🗑️ 바로가기 버튼이 제거되었습니다.");
  };

  // Helper relative time formatter for display on cards
  const formatTimeDifference = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return "방금 전";
      if (diffMins < 60) return `${diffMins}분 전`;
      if (diffHours < 24) return `${diffHours}시간 전`;
      if (diffDays < 7) return `${diffDays}일 전`;
      return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    } catch {
      return "최근 검색";
    }
  };

  // Define dynamic styles that accurately reflect the current theme choice for a premium, clean look
  const t = useMemo(() => {
    const isDark = selectedBgTheme === "dark-black";

    return {
      body: isDark 
        ? "bg-black text-zinc-100 selection:bg-zinc-800 selection:text-white" 
        : "bg-white text-zinc-900 selection:bg-zinc-200 selection:text-zinc-900",
      
      card: isDark 
        ? "bg-zinc-950/80 border border-zinc-850 shadow-none" 
        : "bg-white border border-zinc-200 shadow-sm",
      
      subBox: isDark 
        ? "bg-zinc-900/50 border border-zinc-850 text-zinc-300 hover:bg-zinc-800/50" 
        : "bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100/80",
      
      input: isDark 
        ? "bg-zinc-900/40 border border-zinc-850 text-white placeholder-zinc-500 focus-within:border-zinc-700" 
        : "bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus-within:border-zinc-500 focus-within:bg-white",

      header: isDark
        ? "border-zinc-900 bg-black/95 text-zinc-100"
        : "border-zinc-200 bg-white/95 text-zinc-900",
      
      badge: isDark
        ? "bg-zinc-900 text-zinc-300 border-zinc-850"
        : "bg-zinc-100 text-zinc-700 border-zinc-250",

      heading: isDark ? "text-white" : "text-zinc-900",
      subtext: isDark ? "text-zinc-400" : "text-zinc-600",
      subtextMuted: isDark ? "text-zinc-500" : "text-zinc-405",

      itemCard: isDark 
        ? "bg-zinc-950/60 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/40" 
        : "bg-white border-zinc-200 hover:border-zinc-350 hover:bg-zinc-50/50 shadow-sm",
    };
  }, [selectedBgTheme]);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${t.body}`}>

      {/* --- Dynamic Global Toast Alerts --- */}
      {toastMessage && (
        <div id="vibe-real-toast" className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-slate-200 px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 z-50 animate-bounce text-xs font-mono">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className={`border-b sticky top-0 z-40 px-4 py-3.5 transition-colors duration-350 ${t.header}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Brand area */}
          <div 
            onClick={() => {
              setHasSearched(false);
              setSearchQuery("");
              setResults([]);
            }}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="bg-indigo-650 p-2 rounded-xl text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black tracking-tighter ${t.heading}`}>
                  VibeFind
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border uppercase tracking-wider ${t.badge}`}>
                  MediaWiki API
                </span>
              </div>
              <p className="text-[10px] opacity-70">
                실시간 한국어 및 글로벌 지식 검색 엔진
              </p>
            </div>
          </div>

          {/* Simple Clean Indicator */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="opacity-80">CONNECTED</span>
          </div>

        </div>
      </header>

      {/* --- MAIN PAGE GRID --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Controls & Config Dashboard (4 columns) */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          
          {/* SEARCH CORE CONFIGURATION PANEL */}
          <div className={`p-5 rounded-2xl border transition-colors duration-300 ${t.card}`}>
            <div className="flex items-center justify-between pb-3.5 border-b border-transparent mb-4">
              <span className="text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 uppercase opacity-85">
                <Settings2 className="w-4 h-4 text-indigo-500" />
                <span>vibecoding</span>
              </span>
              <span className={`text-[9px] border px-2 py-0.5 rounded font-mono ${t.badge}`}>
                OPTIONS
              </span>
            </div>

            <div className="space-y-4">
              
              {/* Option 1: Search Language Toggle */}
              <div>
                <label className="block text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>검색 국가 및 서비스 언어</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchLang("ko");
                      triggerToast("🌍 한국어 위키백과 검색 모드로 설정되었습니다.");
                    }}
                    className={`text-xs py-2 rounded-xl border font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      searchLang === "ko" 
                        ? "bg-indigo-600 border-indigo-505 text-white shadow-sm" 
                        : `${t.subBox}`
                    }`}
                  >
                    <span>🇰🇷 한국어 (ko)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchLang("en");
                      triggerToast("🌎 영문 Wikipedia 검색 모드로 설정되었습니다.");
                    }}
                    className={`text-xs py-2 rounded-xl border font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      searchLang === "en" 
                        ? "bg-indigo-600 border-indigo-505 text-white shadow-sm" 
                        : `${t.subBox}`
                    }`}
                  >
                    <span>🇺🇸 English (en)</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Result Limit Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    <span>최대 검색 결과 한도</span>
                  </span>
                  <span className="font-mono text-indigo-500 font-bold">{resultLimit}건의 카드</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="20"
                  step="1"
                  value={resultLimit}
                  onChange={(e) => {
                    setResultLimit(parseInt(e.target.value));
                  }}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-205 dark:bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] opacity-60 font-mono mt-1">
                  <span>3건</span>
                  <span>12건 (기본)</span>
                  <span>20건</span>
                </div>
              </div>

              {/* Option 3: Background Style Selector */}
              <div>
                <label className="block text-xs font-semibold mb-2">🎨 전체 배경 테마 변경</label>
                <select
                  value={selectedBgTheme}
                  onChange={(e) => {
                    setSelectedBgTheme(e.target.value);
                    triggerToast(`🎨 배경 테마가 변경되었습니다: ${e.target.value === "dark-black" ? "깊은 블랙 테마" : "깔끔한 화이트 테마"}`);
                  }}
                  className={`w-full text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer ${t.subBox}`}
                >
                  <option value="dark-black">🖤 Classic Dark (깊은 블랙 테마)</option>
                  <option value="pure-white">🤍 Minimalist Light (깔끔한 화이트 테마)</option>
                </select>
              </div>

            </div>
          </div>

          {/* ACTIVE PAST SEARCH HISTORY SAVER */}
          <div className={`p-5 rounded-2xl border transition-colors duration-300 ${t.card}`}>
            <div className="flex items-center justify-between mb-3 border-b border-transparent pb-1">
              <span className="text-xs font-bold font-mono text-slate-400 flex items-center gap-1.5 uppercase">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>최근 검색 기록</span>
              </span>
              {pastQueries.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-[10px] text-rose-500 hover:text-rose-600 font-bold tracking-tight transition"
                >
                  지우기
                </button>
              )}
            </div>

            {pastQueries.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-slate-500">
                기록 보드가 비어 있습니다.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pastQueries.map((term, idx) => (
                  <div
                    key={`${term}-${idx}`}
                    onClick={() => handleShortcutClick(term)}
                    className={`group text-xs px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition duration-150 ${t.subBox}`}
                  >
                    <span>{term}</span>
                    <button
                      type="button"
                      onClick={(e) => removeHistoryItem(term, e)}
                      className="text-slate-400 hover:text-rose-500 transition rounded-full p-0.5"
                      title="지우기"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[9px] opacity-50 font-mono mt-3 text-right">
              * 로컬 브라우저 세션에 안전하게 저장됩니다
            </div>
          </div>

        </section>

        {/* RIGHT COLUMN: Interactive Search Console & Actual Results Layout (8 columns) */}
        <section className="lg:col-span-8 flex flex-col gap-5">
          
          {/* SEARCH WORKSPACE CARD CONTAINER */}
          <div className={`p-6 rounded-2xl border transition-colors duration-300 ${t.card}`}>
            
            {/* Real Search Box and Form */}
            <form onSubmit={handleSearchFormSubmit} className="space-y-3">
              <div className="flex flex-col gap-0.5 mb-2">
                <h2 className={`text-2xl font-black tracking-tight transition-colors duration-350 ${
                  selectedBgTheme === "dark-black" ? "text-white font-sans" : "text-zinc-950 font-sans"
                }`}>
                  vibeFind
                </h2>
                <span className={`text-[10px] font-mono font-bold tracking-wider block uppercase opacity-75 ${
                  selectedBgTheme === "dark-black" ? "text-zinc-400" : "text-zinc-500"
                }`}>
                  🔍 Live Search Workspace
                </span>
              </div>
              
              <div className={`border rounded-2xl px-4 py-3 flex items-center justify-between shadow-xs transition duration-200 ${
                selectedBgTheme === "dark-black"
                  ? "bg-zinc-950/90 border-zinc-800 focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-800"
                  : "bg-zinc-50 border-zinc-200 focus-within:border-zinc-800 focus-within:ring-2 focus-within:ring-zinc-100"
              }`}>
                <div className="flex items-center gap-3.5 flex-1">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className={`p-2 rounded-xl transition duration-150 shrink-0 ${
                      selectedBgTheme === "dark-black" ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-300" : "bg-zinc-200 hover:bg-zinc-300 text-zinc-700"
                    }`}
                    title="커스텀 바로가기 생성"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <input
                    id="realtime-search-terminal"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="실시간으로 정보가 궁금한 키워드를 입력해보세요 (예: 블랙홀, 뉴진스, 비트코인 등)..."
                    className={`w-full bg-transparent focus:outline-none text-sm focus:ring-0 leading-relaxed font-sans ${
                      selectedBgTheme === "dark-black" ? "text-white placeholder-zinc-500" : "text-zinc-900 placeholder-zinc-400"
                    }`}
                  />
                </div>

                <div className={`flex items-center gap-3 pl-3 border-l shrink-0 ml-2 ${
                  selectedBgTheme === "dark-black" ? "border-zinc-800" : "border-zinc-200"
                }`}>
                  <button
                    type="button"
                    onClick={() => triggerToast("🎤 음성 감지 마이크가 기동되었습니다. (대기 중)")}
                    className={`transition duration-150 ${
                      selectedBgTheme === "dark-black" ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-black"
                    }`}
                    title="음성 검색"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerToast("📷 화면 분석 카메라가 배치되었습니다. (대기 중)")}
                    className={`transition duration-150 ${
                      selectedBgTheme === "dark-black" ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-black"
                    }`}
                    title="이미지 검색"
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`p-2.5 rounded-xl transition duration-200 shrink-0 cursor-pointer ${
                      selectedBgTheme === "dark-black"
                        ? "bg-white text-black hover:bg-zinc-200"
                        : "bg-black text-white hover:bg-zinc-800"
                    }`}
                    title="즉시 검색"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Advanced warning status under input in case search language is mismatching */}
              <div className="flex items-center justify-between text-[10px] opacity-65 font-mono px-1">
                <span>* 진짜 위키피디아 실시간 DB {searchLang === "ko" ? "한국어판" : "영문판"}에 다이렉트 쿼리를 전송합니다.</span>
                <span>#NoMockData</span>
              </div>
            </form>

            {/* PRE-CONSTRUCTED INSTANT EXECUTORS (Search Shortcuts) */}
            <div className="mt-6 pt-5 border-t border-slate-205/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-450 tracking-wider font-mono flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>🚀 실시간 단축키 바로가기</span>
                </span>
                <span className="text-[10px] opacity-60">클릭 즉시 지식 쿼리 전송</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {shortcuts.map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => handleShortcutClick(sc.query)}
                    className={`rounded-xl p-3 cursor-pointer group relative flex items-center gap-2.5 transition duration-200 ${t.itemCard}`}
                  >
                    <div className="p-1 px-1.5 rounded text-sm transform group-hover:scale-105 transition">
                      {sc.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold transition truncate ${t.heading}`}>
                        {sc.name}
                      </h4>
                      <p className="text-[9px] opacity-60 font-mono truncate">"{sc.query}"</p>
                    </div>

                    {/* Small user deletable button */}
                    {sc.badge === "USER" && (
                      <button
                        onClick={(e) => deleteShortcut(sc.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition absolute right-1.5 top-1.5"
                        title="숏컷 삭제"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* DYNAMIC SEARCH RESULTS AREA */}
          <div className={`p-6 rounded-2xl border transition-colors duration-300 min-h-[460px] flex flex-col ${t.card}`}>
            
            {/* Area Header */}
            <div className="flex items-center justify-between pb-3 border-b border-transparent mb-5 shrink-0">
              <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1.5 uppercase">
                <BookOpen className="w-4 h-4 text-indigo-505" />
                <span>영역 결과 보드 (LIVE RESULTS PANEL)</span>
              </span>
              <span className="text-[11px] font-mono text-indigo-500 font-bold">
                {isLoading ? "Searching..." : `Results: ${results.length}건`}
              </span>
            </div>

            {/* CASE 1: LOADING STATE WITH ELEGANT LOG CONTROL */}
            {isLoading && (
              <div className="flex-1 flex flex-col justify-center items-center py-24 space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-slate-205 border-t-indigo-500 rounded-full animate-spin relative" />
                </div>
                <div className="text-center space-y-1 relative">
                  <p className={`text-sm font-bold tracking-tight ${t.heading}`}>
                    실시간 지식 데이터베이스 탐색 중...
                  </p>
                  <p className="text-xs opacity-65 font-mono">
                    [{searchQuery || activeQuery}] 데이터 패킷을 실시간 조회 가공 중입니다.
                  </p>
                </div>
              </div>
            )}

            {/* CASE 2: ERROR OCCURRED */}
            {!isLoading && error && (
              <div className="flex-1 flex flex-col justify-center items-center py-20 px-6 text-center">
                <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-4 border border-rose-500/20">
                  <AlertCircle className="w-6 h-6 animate-bounce" />
                </div>
                <h3 className={`text-base font-extrabold ${t.heading}`}>검색 결과를 불러오는 데 실패했습니다</h3>
                <p className="text-xs opacity-70 mt-2 max-w-sm leading-relaxed">
                  {error}. 네트워크 파이프라인 지연 상태거나 API 응답 규격을 처리 완료하지 못했습니다. 검색어를 다각화해 다시 눌러 주십시오.
                </p>
                <button
                  onClick={() => executeRealSearch(activeQuery || searchQuery)}
                  className="mt-5 bg-indigo-650 hover:bg-indigo-605 text-white text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition font-mono cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>재검색 기동</span>
                </button>
              </div>
            )}

            {/* CASE 3: NO RESULTS / EMPTY OR BLANK INITIAL STATE */}
            {!isLoading && !error && results.length === 0 && (
              <div className="flex-1 flex flex-col justify-center items-center py-24 px-6 text-center">
                
                {hasSearched ? (
                  <>
                    <div className="w-14 h-14 bg-amber-500/10 text-amber-505 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20">
                      <HelpCircle className="w-7 h-7 text-amber-500" />
                    </div>
                    <h3 className={`text-base font-extrabold ${t.heading}`}>해당 키워드의 검색 결과가 없습니다</h3>
                    <p className="text-xs opacity-70 mt-2 max-w-sm leading-relaxed">
                      "[{activeQuery}]" 키워드에 부합하는 결과를 전해 받지 못했습니다. 보다 포괄적인 지리 명칭, 인물, 기술, 또는 개념(예: '우주', '한국', 'React.js', '초등교육') 검색을 권장드립니다.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-indigo-505/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-4 border border-indigo-500/20">
                      <Search className="w-6 h-6 text-indigo-500" />
                    </div>
                    <h3 className={`text-base font-bold ${t.heading}`}>검색어를 기다리고 있습니다</h3>
                    <p className="text-xs opacity-70 mt-2 max-w-sm leading-relaxed">
                      모든 가공된 텍스트와 시뮬레이션 목업은 영구 히스토리로 폐기되었습니다. 위 검색 입력창 혹은 아래 단축키를 눌러 "진짜 지식 데이터"를 불러와 주십시오.
                    </p>
                    
                    {/* Extra design visual prompt cards to keep spacing pretty */}
                    <div className="grid grid-cols-2 gap-3.5 mt-8 w-full max-w-md">
                      <div className={`p-3 rounded-xl text-left border ${t.subBox}`}>
                        <span className="text-[10px] font-mono text-indigo-500 font-bold block mb-1">RECOMMENDED TO TRY</span>
                        <p className={`text-xs font-bold ${t.heading}`}>위키피디아 지능 매칭</p>
                        <p className="text-[10px] opacity-70 mt-1">질이 높은 대규모 도큐멘트를 실시간 동적 JSON으로 디코딩해 옵니다.</p>
                      </div>
                      <div className={`p-3 rounded-xl text-left border ${t.subBox}`}>
                        <span className="text-[10px] font-mono text-indigo-505 font-bold block mb-1">CORS SAFE ENGINE</span>
                        <p className={`text-xs font-bold ${t.heading}`}>자연어 우회 탐색</p>
                        <p className="text-[10px] opacity-70 mt-1">자음 모음 분절 필터링 기술이 안전하고 빠른 반응을 보장합니다.</p>
                      </div>
                    </div>
                  </>
                )}

              </div>
            )}

            {/* CASE 4: RENDER BEAUTIFUL CARDS FOR ACTUAL RESULTS */}
            {!isLoading && !error && results.length > 0 && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`group rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${t.itemCard}`}
                  >
                    
                    {/* Top badged header on card */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${t.badge}`}>
                          {item.source}
                        </span>

                        <span className="text-[10px] opacity-65 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeDifference(item.timestamp)}</span>
                        </span>
                      </div>

                      {/* Main Title of item */}
                      <h3 className={`text-sm font-bold tracking-tight mb-2 transition-colors ${t.heading}`}>
                        {item.title}
                      </h3>

                      {/* Snippet / Content Summary text from result */}
                      <p className="text-xs leading-relaxed line-clamp-4 opacity-80">
                        {item.snippet}
                      </p>
                    </div>

                    {/* Footer interactive info of card */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100/10 flex items-center justify-between shrink-0">
                      
                      <div className="flex items-center gap-3 text-[11px] font-mono opacity-65">
                        <span>단어 수: <strong className="text-indigo-400">{item.wordcount.toLocaleString("ko-KR")}개</strong></span>
                      </div>

                      {/* Open real page in a brand new tab */}
                      <a
                        href={item.url}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        onClick={() => triggerToast(`🔗 외부 위키 문서로 이동합니다: ${item.title}`)}
                        className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-505 hover:text-indigo-600 transition"
                      >
                        <span>자세히 보기</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                    </div>

                    {/* Index count identifier corner design */}
                    <div className="absolute -top-6 -right-6 w-10 h-10 bg-indigo-500/5 rounded-full flex items-center justify-center font-bold font-mono text-xs translate-x-2 -translate-y-2 select-none opacity-50">
                      {idx + 1}
                    </div>

                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 pt-3.5 border-t text-[11px] opacity-70 flex flex-col xs:flex-row items-center justify-between gap-2 shrink-0 border-slate-100/10">
              <span>* 실시간 API와 위키백과 미디어위키 API 데이터를 정면으로 겪고 파싱합니다.</span>
              <span className="flex items-center gap-1 hover:text-rose-500 transition cursor-pointer" onClick={() => triggerToast("💖 바이브파인드 개발자에게 사랑을 뿜어주셔서 감사합니다!")}>
                <span>VibeFind Creator Team</span>
                <Heart className="w-3 h-3 text-rose-550 fill-rose-550 animate-pulse" />
              </span>
            </div>

          </div>

        </section>

      </main>

      {/* --- EXTRA ADVANCED MODAL: CREATE CUSTOM SHORTCUT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`border rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-150 ${t.card}`}>
            
            <button
              onClick={() => setIsModalOpen(false)}
              className={`absolute top-4.5 right-4.5 transition ${
                selectedBgTheme === "dark-black" ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-black"
              }`}
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-lg border ${
                selectedBgTheme === "dark-black" ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-100 border-zinc-200 text-black"
              }`}>
                <Plus className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className={`text-base font-extrabold ${t.heading}`}>커스텀 바로가기 추가</h3>
                <p className={`text-[11px] ${t.subtext}`}>자주 검색하는 단어를 핫 키워드에 심어두세요</p>
              </div>
            </div>

            <form onSubmit={handleCreateShortcut} className="space-y-4">
              
              <div>
                <label className={`block text-xs font-mono font-bold mb-2 ${
                  selectedBgTheme === "dark-black" ? "text-zinc-400" : "text-zinc-600"
                }`}>
                  단축키 이름 (예: 독도, 아이유)
                </label>
                <input
                  type="text"
                  required
                  value={newShortcutName}
                  onChange={(e) => setNewShortcutName(e.target.value)}
                  placeholder="예: 대한민국 역사"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none ${t.input}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-mono font-bold mb-2 ${
                  selectedBgTheme === "dark-black" ? "text-zinc-400" : "text-zinc-600"
                }`}>
                  검색할 정확한 키워드 (실시간으로 위키에서 검색)
                </label>
                <input
                  type="text"
                  required
                  value={newShortcutQuery}
                  onChange={(e) => setNewShortcutQuery(e.target.value)}
                  placeholder="예: 독도"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none ${t.input}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-mono font-bold mb-2 ${
                  selectedBgTheme === "dark-black" ? "text-zinc-400" : "text-zinc-600"
                }`}>
                  아이콘 이모지 선택
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {["💡", "🎬", "🐱", "🌌", "🇰🇷", "🧠", "🔥", "🚀", "❤️", "⚽", "🧩", "🌟"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewShortcutIcon(emoji)}
                      className={`py-2 text-base rounded-xl transition ${
                        newShortcutIcon === emoji 
                          ? (selectedBgTheme === "dark-black" ? "bg-white text-black font-bold" : "bg-black text-white font-bold")
                          : `${t.subBox}`
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition ${
                    selectedBgTheme === "dark-black" ? "border-zinc-805 text-zinc-400 hover:text-white" : "border-zinc-200 text-zinc-600 hover:text-black"
                  }`}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-xs font-extrabold active:scale-95 transition ${
                    selectedBgTheme === "dark-black"
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "bg-black text-white hover:bg-zinc-800"
                  }`}
                >
                  숏컷 생성하기
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* --- FOOTER BANNER --- */}
      <footer className={`border-t py-6 text-center text-xs font-mono shrink-0 transition-colors duration-300 ${
        selectedBgTheme === "dark-black" 
          ? "border-zinc-900 bg-black text-zinc-500" 
          : "border-zinc-200 bg-zinc-50 text-zinc-500"
      }`}>
        <p>© 2026 VibeFind Inc. All Rights Reserved. Powered by Wikipedia MediaWiki Live Queries.</p>
        <p className="mt-1 text-[10px]">인간 중심 실시간 정보 다각화 기하학적 백엔드 포털</p>
      </footer>

    </div>
  );
}
