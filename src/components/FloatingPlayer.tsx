import React, { useState } from 'react';
import { MovieItem } from '../types';
import {
  Maximize2,
  X,
  Play,
  Pause,
  ChevronRight,
  Tv,
  Film,
  RotateCw,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface FloatingPlayerProps {
  movie: MovieItem | null;
  season: number;
  episode: number;
  mode: 'full' | 'trailer';
  trailerKey?: string | null;
  activeServerUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onMaximize: () => void;
  onNextEpisode?: () => void;
}

export const FloatingPlayer: React.FC<FloatingPlayerProps> = ({
  movie,
  season,
  episode,
  mode,
  trailerKey,
  activeServerUrl,
  isOpen,
  onClose,
  onMaximize,
  onNextEpisode,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);

  if (!isOpen || !movie) return null;

  const isTv = movie.media_type === 'tv' || Boolean(movie.first_air_date && !movie.release_date);
  const title = movie.title || movie.name || 'Featured Cinema';

  return (
    <div
      className={`fixed bottom-6 right-6 z-[250] bg-black/95 border border-[#FFB612]/50 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 backdrop-blur-2xl ${
        isMinimized ? 'w-72 h-14' : 'w-80 sm:w-96 md:w-[420px] h-[260px] sm:h-[280px]'
      }`}
    >
      {/* Floating Header */}
      <div className="bg-black/90 px-3.5 py-2 flex items-center justify-between border-b border-white/10 select-none">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[10px] font-mono font-black text-[#FFB612] uppercase tracking-wider shrink-0">
            PIP {mode === 'trailer' ? 'TRAILER' : isTv ? `S${season}:E${episode}` : 'FULL HD'}
          </span>
          <span className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Next Episode Button for Series */}
          {isTv && onNextEpisode && (
            <button
              onClick={onNextEpisode}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#FFB612] transition"
              title="Next Episode"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Reload Stream */}
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
            title="Reload Video"
          >
            <RotateCw className="w-3 h-3" />
          </button>

          {/* Maximize back to Full Modal */}
          <button
            onClick={onMaximize}
            className="p-1 rounded-lg bg-[#FFB612] hover:bg-yellow-400 text-black transition"
            title="Expand to Full Player"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Close Floating Window */}
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/10 hover:bg-red-600 text-gray-300 hover:text-white transition"
            title="Close Floating Window"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Floating Video Body */}
      {!isMinimized && (
        <div className="relative w-full h-[calc(100%-37px)] bg-black overflow-hidden">
          {mode === 'trailer' && trailerKey ? (
            <div className="relative w-full h-full overflow-hidden">
              <iframe
                key={`float-trailer-${trailerKey}-${iframeKey}`}
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=0`}
                className="w-full h-full border-0 transform scale-[1.05] origin-center"
                sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                title={`${title} Trailer Floating`}
              />
              {/* Cinema Watermark Mask to completely obscure YouTube branding */}
              <div className="absolute bottom-2 right-2 z-20 pointer-events-none px-2 py-0.5 bg-black/90 backdrop-blur-md rounded border border-white/10 text-[9px] font-mono text-[#FFB612] font-black tracking-widest uppercase">
                NAIFLIX CINEMA
              </div>
            </div>
          ) : (
            <iframe
              key={`float-stream-${activeServerUrl}-${iframeKey}`}
              src={activeServerUrl}
              className="w-full h-full border-0 bg-black"
              sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              title={`${title} Floating Full Stream`}
            />
          )}
        </div>
      )}
    </div>
  );
};
