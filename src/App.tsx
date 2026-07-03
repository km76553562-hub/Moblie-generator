import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wallpaper, PresetMood } from "./types";
import WallpaperCard from "./components/WallpaperCard";
import FullscreenViewer from "./components/FullscreenViewer";
import { Sparkles, Image as ImageIcon, Info, History, AlertCircle, RefreshCw, Send, HelpCircle } from "lucide-react";

// Predefined evocative emotional mood chips
const PRESET_MOODS: PresetMood[] = [
  { id: "1", emoji: "🌧️", label: "비 오는 서정적인 도시", prompt: "비 오는 서정적인 도시 풍경" },
  { id: "2", emoji: "🌌", label: "은하수와 밤하늘", prompt: "신비롭고 몽환적인 우주 은하수와 별똥별" },
  { id: "3", emoji: "🏡", label: "아늑한 동화 속 숲속", prompt: "따뜻한 아침 햇살이 스며드는 깊은 안개 속 동화 같은 오두막" },
  { id: "4", emoji: "🌆", label: "노을빛 에메랄드 바다", prompt: "황금빛 서정적인 노을이 파도에 부서지는 에메랄드빛 해변" },
  { id: "5", emoji: "🔮", label: "사이버펑크 미래 골목", prompt: "비에 젖은 어두운 골목길에 화려한 네온사인이 반사되는 사이버펑크 도시" },
  { id: "6", emoji: "🧸", label: "구름나라 아기 고양이", prompt: "파스텔톤 몽실한 구름 위에서 노는 귀여운 고양이 일러스트" },
  { id: "7", emoji: "🌳", label: "지브리풍 초록 언덕", prompt: "청량하고 투명한 여름날 푸른 언덕과 새하얀 뭉게구름" },
  { id: "8", emoji: "🎨", label: "미니멀 파스텔 그라데이션", prompt: "현대적이고 감성적인 파스텔 추상 그라데이션 아트" },
];

const LOADING_STEPS = [
  "Gemini가 단어의 예술적 뉘앙스를 해석하고 있습니다...",
  "4가지 서로 다른 창조적인 콘셉트를 구상하고 있습니다...",
  "영문 아트 디렉션용 초고화질 프롬프트 생성 완료...",
  "Imagen 3 모델이 9:16 비율로 디테일을 그리기 시작합니다...",
  "빛의 반사와 질감, 아웃포커싱 디테일을 마법처럼 조정하고 있습니다...",
];

export default function App() {
  const [mood, setMood] = useState("");
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [history, setHistory] = useState<Wallpaper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [isHealthChecking, setIsHealthChecking] = useState(true);

  // Check API status on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setHasApiKey(data.hasApiKey);
      } catch (e) {
        console.error("Health check error:", e);
        setHasApiKey(false);
      } finally {
        setIsHealthChecking(false);
      }
    };
    checkHealth();

    // Load saved wallpapers from localStorage
    try {
      const saved = localStorage.getItem("ai_wallpapers_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Localstorage load error:", e);
    }
  }, []);

  // Cycle loading messages when generating
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const saveToHistory = (newWallpapers: Wallpaper[]) => {
    try {
      // Limit history to last 16 wallpapers to avoid LocalStorage quota limits (5MB)
      const updatedHistory = [...newWallpapers, ...history].slice(0, 16);
      setHistory(updatedHistory);
      localStorage.setItem("ai_wallpapers_history", JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Localstorage save error:", e);
      // If we run out of quota, clear half
      localStorage.removeItem("ai_wallpapers_history");
    }
  };

  const handleGenerate = async (promptText: string) => {
    const targetPrompt = promptText.trim();
    if (!targetPrompt) return;

    setIsLoading(true);
    setErrorMsg(null);
    setWallpapers([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: targetPrompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "배경화면 생성 중 예상치 못한 에러가 발생했습니다.");
      }

      if (data.success && Array.isArray(data.wallpapers)) {
        setWallpapers(data.wallpapers);
        saveToHistory(data.wallpapers);
      } else {
        throw new Error("올바른 이미지 데이터를 받지 못했습니다.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "서버와 연결할 수 없거나 이미지 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemix = (wallpaper: Wallpaper) => {
    setMood(wallpaper.mood);
    setSelectedWallpaper(null);
    handleGenerate(wallpaper.mood);
  };

  const handleClearHistory = () => {
    if (confirm("저장된 최근 생성 기록을 모두 지우시겠습니까?")) {
      setHistory([]);
      localStorage.removeItem("ai_wallpapers_history");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-400 selection:text-slate-950 pb-16">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-blue-900/15 via-purple-900/5 to-transparent -z-10 pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-80 h-80 rounded-full bg-indigo-500/5 blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-80 h-80 rounded-full bg-amber-500/5 blur-[120px] -z-10 pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-md mx-auto px-4 pt-8">
        
        {/* Header App Brand */}
        <header className="text-center mb-8 space-y-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-amber-300 text-xs font-bold"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span>AI 모바일 이미지 연구소</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-black tracking-tight text-white bg-clip-text"
          >
            AI <span className="text-amber-300">하루배경</span>
          </motion.h1>
          <p className="text-xs text-slate-400 font-medium">
            원하는 감성을 키워드로 입력하면 스마트폰 세로 비율(9:16) 맞춤 4가지 시그니처 테마를 그립니다.
          </p>
        </header>

        {/* API Key Connection Check Warning */}
        {hasApiKey === false && !isHealthChecking && (
          <div className="mb-6 bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-amber-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <h4 className="font-bold text-sm">Gemini API 키 설정 필요</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              배경화면 생성을 시작하려면 AI Studio 우측 상단의 <strong>Settings &gt; Secrets</strong> 패널에서 <strong>GEMINI_API_KEY</strong>를 등록해주셔야 합니다.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl space-y-1.5 border border-slate-800 text-[11px] text-slate-400 font-mono">
              <div>1. 우측 상단 톱니바퀴 [Settings] 클릭</div>
              <div>2. [Secrets] 탭 선택</div>
              <div>3. [Add Secret] 클릭 후 이름: GEMINI_API_KEY 입력</div>
              <div>4. 사용자의 API 키 값을 붙여넣기 후 저장</div>
            </div>
          </div>
        )}

        {/* Generation Form Card */}
        <section className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-2xl backdrop-blur-md mb-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="mood-input" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                어떤 분위기의 배경화면을 원하시나요?
              </label>
              <div className="relative">
                <input
                  id="mood-input"
                  type="text"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="예: 비 오는 조용한 밤의 도시 풍경"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && mood.trim() && !isLoading) {
                      handleGenerate(mood);
                    }
                  }}
                  className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-slate-500 transition-all outline-none"
                />
                <button
                  onClick={() => handleGenerate(mood)}
                  disabled={isLoading || !mood.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Suggestions Chips Grid */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                추천 테마 (탭하여 자동 생성)
              </span>
              <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                {PRESET_MOODS.map((p) => (
                  <button
                    key={p.id}
                    disabled={isLoading}
                    onClick={() => {
                      setMood(p.prompt);
                      handleGenerate(p.prompt);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-50 text-left transition-all hover:bg-slate-900"
                  >
                    <span className="text-xs">{p.emoji}</span>
                    <span className="text-xs font-semibold text-slate-300 truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Error Message Panel */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start space-x-2"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">배경화면 생성 실패</p>
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          </motion.div>
        )}

        {/* 4 Wallpaper Grid / Active Loading */}
        <section className="space-y-4 mb-12">
          {isLoading && (
            <div className="space-y-4">
              {/* Dynamic Step Loader Indicator */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-3">
                <RefreshCw className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
                <div className="text-xs font-medium text-slate-300 animate-pulse">
                  {LOADING_STEPS[loadingStep]}
                </div>
              </div>

              {/* Skeleton Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                {[1, 2, 3, 4].map((i) => (
                  <WallpaperCard key={i} wallpaper={{} as Wallpaper} onSelect={() => {}} isLoading={true} />
                ))}
              </div>
            </div>
          )}

          {/* New Wallpapers Display (Active generation completed) */}
          {!isLoading && wallpapers.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>생성된 테마 배경화면 (4가지 버전)</span>
                </div>
                <span className="text-[10px] text-slate-500">탭하여 크게 보기</span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {wallpapers.map((wp) => (
                  <WallpaperCard
                    key={wp.id}
                    wallpaper={wp}
                    onSelect={(selected) => setSelectedWallpaper(selected)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </section>

        {/* History Gallery (Saved local wallpapers) */}
        {history.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400">
                <History className="w-4 h-4 text-indigo-400" />
                <span>나의 최근 생성 보관함 ({history.length})</span>
              </div>
              <button
                onClick={handleClearHistory}
                className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                전체 삭제
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {history.map((wp) => (
                <WallpaperCard
                  key={wp.id}
                  wallpaper={wp}
                  onSelect={(selected) => setSelectedWallpaper(selected)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Informative Footer Tips */}
        <footer className="mt-16 text-center space-y-3">
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900/40 text-slate-500 text-[10px]">
            <Info className="w-3.5 h-3.5" />
            <span>생성된 이미지는 Imagen 3 모델에 의해 그려집니다.</span>
          </div>
          <p className="text-[10px] text-slate-600">
            © 2026 AI 하루배경. All rights reserved.
          </p>
        </footer>
      </div>

      {/* Fullscreen Viewer Modal */}
      <AnimatePresence>
        {selectedWallpaper && (
          <FullscreenViewer
            wallpaper={selectedWallpaper}
            onClose={() => setSelectedWallpaper(null)}
            onRemix={handleRemix}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
