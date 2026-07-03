import { motion } from "motion/react";
import { Wallpaper } from "../types";
import { ZoomIn, Sparkles } from "lucide-react";

interface WallpaperCardProps {
  key?: string | number;
  wallpaper: Wallpaper;
  onSelect: (wallpaper: Wallpaper) => void;
  isLoading?: boolean;
}

export default function WallpaperCard({ wallpaper, onSelect, isLoading = false }: WallpaperCardProps) {
  if (isLoading) {
    return (
      <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden animate-shimmer border border-slate-800 flex flex-col justify-end p-4">
        <div className="space-y-2">
          <div className="h-4 bg-slate-700/50 rounded w-1/3 animate-pulse" />
          <div className="h-3 bg-slate-700/30 rounded w-3/4 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(wallpaper)}
      className="group relative aspect-[9/16] w-full rounded-2xl overflow-hidden cursor-pointer border border-slate-800 shadow-xl bg-slate-900/40"
    >
      {/* Wallpaper Image */}
      {wallpaper.imageUrl ? (
        <img
          src={wallpaper.imageUrl}
          alt={`${wallpaper.styleName} - ${wallpaper.mood}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-800 text-slate-400 text-center">
          <Sparkles className="w-8 h-8 mb-2 text-rose-400 animate-pulse" />
          <p className="text-xs font-medium">이미지 로드 실패</p>
        </div>
      )}

      {/* Hover Zoom Overlay */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <div className="p-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white transform scale-90 group-hover:scale-100 transition-transform duration-300">
          <ZoomIn className="w-5 h-5" />
        </div>
      </div>

      {/* Style & Description Glassmorphic Overlay */}
      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent pt-12">
        <div className="backdrop-blur-md bg-slate-950/40 border border-white/10 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              {wallpaper.styleName}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-200 font-medium line-clamp-2">
            {wallpaper.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
