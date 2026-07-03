import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wallpaper } from "../types";
import { X, Download, RefreshCw, Eye, EyeOff, Calendar, Lock, Smartphone } from "lucide-react";

interface FullscreenViewerProps {
  wallpaper: Wallpaper;
  onClose: () => void;
  onRemix: (wallpaper: Wallpaper) => void;
}

export default function FullscreenViewer({ wallpaper, onClose, onRemix }: FullscreenViewerProps) {
  const [showPreviewOverlay, setShowPreviewOverlay] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  // Set up live lock screen clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format time (e.g., 10:09)
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);

      // Format date in Korean (e.g., 7월 2일 목요일)
      const options: Intl.DateTimeFormatOptions = {
        month: "long",
        day: "numeric",
        weekday: "long",
      };
      setCurrentDate(now.toLocaleDateString("ko-KR", options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = () => {
    if (!wallpaper.imageUrl) return;
    try {
      const link = document.createElement("a");
      link.href = wallpaper.imageUrl;
      // Sanitize file name
      const safeName = wallpaper.mood.trim().replace(/[^a-zA-Z0-9가-힣]/g, "_");
      link.download = `AI_wallpaper_${safeName}_${wallpaper.styleName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("다운로드 도중 에러 발생:", error);
      alert("다운로드 실패: 브라우저가 직접 다운로드를 차단했을 수 있습니다. 이미지를 길게 누르면 저장할 수 있습니다.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-xl flex flex-col md:flex-row items-center justify-center p-4 md:p-8"
    >
      {/* Phone Mockup Screen */}
      <div className="relative w-full max-w-[360px] aspect-[9/16] bg-slate-900 rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border-[6px] border-slate-800 flex-shrink-0">
        {/* Wallpaper Image */}
        {wallpaper.imageUrl ? (
          <img
            src={wallpaper.imageUrl}
            alt={wallpaper.styleName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover select-none"
          />
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center">
            <p className="text-slate-400">이미지 없음</p>
          </div>
        )}

        {/* Dynamic Mock Lock Screen Overlay */}
        <AnimatePresence>
          {showPreviewOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col justify-between p-8 text-white select-none pointer-events-none"
            >
              {/* Top Section: Lock Icon, Date & Time */}
              <div className="flex flex-col items-center pt-8 space-y-2">
                <Lock className="w-4 h-4 text-white/80 animate-bounce" />
                <span className="text-sm font-medium tracking-wide drop-shadow-md text-white/95">
                  {currentDate}
                </span>
                <span className="text-6xl font-light tracking-tight drop-shadow-lg text-white font-sans">
                  {currentTime}
                </span>
              </div>

              {/* Bottom Section: Mock Slide-to-unlock hint & Shortcut Icons */}
              <div className="flex flex-col items-center pb-6 space-y-6">
                <div className="flex justify-between w-full max-w-[180px]">
                  <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/90">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/90">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-xs font-light text-white/60 tracking-widest uppercase animate-pulse">
                  밀어서 잠금해제
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera notch / dynamic island simulation */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-10" />
      </div>

      {/* Control Panel (Right side on desktop, Bottom on mobile) */}
      <div className="w-full max-w-[360px] md:max-w-md md:ml-8 mt-6 md:mt-0 flex flex-col justify-between space-y-6 bg-slate-900/60 p-5 rounded-3xl border border-slate-800 backdrop-blur-md">
        {/* Info Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-300 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              {wallpaper.styleName}
            </span>
            <button
              onClick={() => setShowPreviewOverlay(!showPreviewOverlay)}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors py-1 px-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50"
            >
              {showPreviewOverlay ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>잠금화면 가리기</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>잠금화면 미리보기</span>
                </>
              )}
            </button>
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-1 leading-snug">
            "{wallpaper.mood}"
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-white/5">
            {wallpaper.description}
          </p>
        </div>

        {/* English Prompt details */}
        <div className="space-y-1 bg-slate-950/20 p-3 rounded-xl border border-slate-800/40">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            AI Prompt (English)
          </span>
          <p className="text-[11px] font-mono text-slate-400 leading-relaxed select-all line-clamp-3">
            {wallpaper.englishPrompt}
          </p>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col space-y-2.5">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 active:scale-98 transition-all shadow-lg shadow-amber-500/10"
          >
            <Download className="w-5 h-5" />
            <span>스마트폰 배경화면 저장</span>
          </button>

          <button
            onClick={() => onRemix(wallpaper)}
            className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 active:scale-98 transition-all border border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>이 스타일로 리믹스 (수정하기)</span>
          </button>

          <button
            onClick={onClose}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-transparent text-slate-400 font-medium hover:text-white transition-all border border-transparent hover:border-slate-800"
          >
            <X className="w-4 h-4" />
            <span>이전 화면으로</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
