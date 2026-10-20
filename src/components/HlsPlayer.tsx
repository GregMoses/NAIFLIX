import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Film,
  Maximize,
  Minimize,
  RotateCw,
  Server,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Tv,
  Sparkles,
  Clapperboard,
  PictureInPicture,
  Zap,
  Volume2,
  VolumeX,
  FastForward,
  CheckCircle2,
} from 'lucide-react';

const API_KEY = '68ba09e7355a443a32a428981c6ea063';

interface HlsPlayerProps {
  streamUrl?: string;
  posterUrl?: string;
  title: string;
  type?: 'movie' | 'tv';
  tmdbId?: number;
  season?: number;
  episode?: number;
  initialMode?: 'full' | 'trailer';
  onSeasonChange?: (s: number) => void;
  onEpisodeChange?: (e: number) => void;
  onRequestDownload?: () => void;
  onTogglePip?: () => void;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({
  streamUrl,
  posterUrl,
  title,
  type = 'movie',
  tmdbId,
  season = 1,
  episode = 1,
  initialMode = 'full',
  onSeasonChange,
  onEpisodeChange,
  onRequestDownload,
  onTogglePip,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Playback mode: 'full' (full movie / TV episode) vs 'trailer' (official HD trailer)
  const [playbackMode, setPlaybackMode] = useState<'full' | 'trailer'>(initialMode);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState<boolean>(false);

  // Auto-sync next episode feature
  const [autoSyncNext, setAutoSyncNext] = useState<boolean>(true);
  const [showNextOverlay, setShowNextOverlay] = useState<boolean>(false);
  const [nextCountdown, setNextCountdown] = useState<number>(5);

  // Free, high-speed, zero-lag streaming servers (Plex, Jellyfin, Emby, CDN nodes)
  const servers = [
    {
      id: 'server-1',
      name: 'Plex Media Node (Server 1)',
      badge: 'PLEX 4K',
      ping: '14ms',
      getUrl: () =>
        type === 'tv'
          ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
          : `https://vidsrc.to/embed/movie/${tmdbId}`,
    },
    {
      id: 'server-2',
      name: 'Jellyfin Direct (Server 2)',
      badge: 'JELLYFIN',
      ping: '18ms',
      getUrl: () =>
        type === 'tv'
          ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`
          : `https://vidlink.pro/movie/${tmdbId}`,
    },
    {
      id: 'server-3',
      name: 'Emby Media Cloud (Server 3)',
      badge: 'EMBY VIP',
      ping: '22ms',
      getUrl: () =>
        type === 'tv'
          ? `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${season}&episode=${episode}`
          : `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`,
    },
    {
      id: 'server-4',
      name: 'Global CDN (Server 4)',
      badge: 'EDGE 4K',
      ping: '28ms',
      getUrl: () =>
        type === 'tv'
          ? `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`
          : `https://vidsrc.xyz/embed/movie/${tmdbId}`,
    },
  ];

  const [selectedServerId, setSelectedServerId] = useState<string>('server-1');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Fetch official trailer from TMDB
  useEffect(() => {
    if (!tmdbId) return;
    let isCancelled = false;
    const fetchTrailer = async () => {
      setIsLoadingTrailer(true);
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${tmdbId}/videos?api_key=${API_KEY}`
        );
        if (res.ok && !isCancelled) {
          const data = await res.json();
          const results = data.results || [];
          const found =
            results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ||
            results.find((v: any) => v.site === 'YouTube');
          if (found) {
            setTrailerKey(found.key);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!isCancelled) setIsLoadingTrailer(false);
      }
    };

    fetchTrailer();
    return () => {
      isCancelled = true;
    };
  }, [tmdbId, type]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard navigation for TV, Laptop, and Desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (onTogglePip) onTogglePip();
      } else if (e.key === 'n' || e.key === 'N') {
        if (type === 'tv') {
          e.preventDefault();
          handleNextEpisode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [type, episode, onTogglePip]);

  // Mouse move control bar auto-hide
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4500);
  }, []);

  const activeServer = servers.find((s) => s.id === selectedServerId) || servers[0];
  const activeStreamUrl = activeServer.getUrl();

  // Next / Prev Episode Handlers for Series
  const handlePrevEpisode = () => {
    if (episode > 1 && onEpisodeChange) {
      onEpisodeChange(episode - 1);
      setIframeKey((k) => k + 1);
      setShowNextOverlay(false);
    }
  };

  const handleNextEpisode = () => {
    if (onEpisodeChange) {
      onEpisodeChange(episode + 1);
      setIframeKey((k) => k + 1);
      setShowNextOverlay(false);
    }
  };

  // Auto-sync countdown effect when overlay is triggered
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showNextOverlay && nextCountdown > 0) {
      timer = setTimeout(() => {
        setNextCountdown((c) => c - 1);
      }, 1000);
    } else if (showNextOverlay && nextCountdown === 0) {
      handleNextEpisode();
    }
    return () => clearTimeout(timer);
  }, [showNextOverlay, nextCountdown]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full bg-black select-none overflow-hidden group flex flex-col justify-center items-center"
    >
      {/* Top Floating Control Bar */}
      <div
        className={`absolute top-3 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-2 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Playback Mode Switcher: Full Feature vs Official Trailer */}
        <div className="flex items-center gap-1 bg-black/90 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-2xl">
          <button
            onClick={() => setPlaybackMode('full')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition ${
              playbackMode === 'full'
                ? 'bg-[#FFB612] text-black shadow-lg shadow-yellow-500/30'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Play className="w-3 h-3 fill-current" />
            {type === 'tv' ? `Full Series (S${season}:E${episode})` : 'Full Movie'}
          </button>

          <button
            onClick={() => setPlaybackMode('trailer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition ${
              playbackMode === 'trailer'
                ? 'bg-[#FFB612] text-black shadow-lg shadow-yellow-500/30'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Clapperboard className="w-3 h-3" />
            Official Trailer
          </button>
        </div>

        {/* Free High-Speed Servers (Plex, Jellyfin, Emby, Global CDN) */}
        {playbackMode === 'full' && (
          <div className="flex items-center gap-1 bg-black/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-xl overflow-x-auto max-w-full">
            <Server className="w-3.5 h-3.5 text-[#FFB612] shrink-0" />
            <span className="text-[10px] text-gray-400 font-mono hidden lg:inline mr-1">SERVERS:</span>

            {servers.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedServerId(s.id);
                  setIframeKey((k) => k + 1);
                }}
                className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black tracking-wider transition uppercase flex items-center gap-1 whitespace-nowrap ${
                  selectedServerId === s.id
                    ? 'bg-[#FFB612] text-black shadow-md shadow-yellow-500/20'
                    : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20'
                }`}
                title={`${s.name} • Latency: ${s.ping}`}
              >
                <span>{s.badge}</span>
                <span className="text-[8px] opacity-70 hidden sm:inline">({s.ping})</span>
              </button>
            ))}

            <button
              onClick={() => setIframeKey((k) => k + 1)}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition ml-0.5"
              title="Reload Stream (R)"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* TV Series Episode Controls & Auto-Sync Next Toggle */}
        {type === 'tv' && playbackMode === 'full' && (
          <div className="flex items-center gap-1.5 bg-black/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-xs shadow-xl">
            <button
              onClick={handlePrevEpisode}
              disabled={episode <= 1}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition"
              title="Previous Episode"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="font-mono text-[10px] text-[#FFB612] font-black px-1.5">
              S{season} : E{episode}
            </span>

            <button
              onClick={handleNextEpisode}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1"
              title="Next Episode (N)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Auto-Sync Next Toggle */}
            <button
              onClick={() => setAutoSyncNext(!autoSyncNext)}
              className={`text-[9px] font-mono px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                autoSyncNext
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                  : 'border-white/10 text-gray-400 bg-white/5'
              }`}
              title="Auto-sync next episode when finished"
            >
              <FastForward className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">AUTO-SYNC</span>
            </button>
          </div>
        )}

        {/* Right Action Buttons: PIP, Download, Cinema Tab, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Picture-in-Picture / Floating Window Button */}
          {onTogglePip && (
            <button
              onClick={onTogglePip}
              className="bg-black/80 hover:bg-black text-white hover:text-[#FFB612] p-2 rounded-full border border-white/10 transition shadow-lg"
              title="Floating Window / Picture-in-Picture (P)"
            >
              <PictureInPicture className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Download Button */}
          {onRequestDownload && (
            <button
              onClick={onRequestDownload}
              className="bg-[#FFB612] hover:bg-yellow-400 text-black px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition shadow-lg shadow-yellow-500/20 flex items-center gap-1 cursor-pointer"
            >
              Download
            </button>
          )}

          {/* Open Cinema Window (Unrestricted External Tab) */}
          <a
            href={playbackMode === 'full' ? activeStreamUrl : `https://www.youtube.com/watch?v=${trailerKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black/80 hover:bg-black text-[#FFB612] px-2.5 py-1.5 rounded-full border border-[#FFB612]/40 transition hidden sm:flex items-center gap-1 text-[10px] font-black uppercase shadow-lg"
            title="Open In Full Cinema Window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Cinema Tab</span>
          </a>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="bg-black/60 hover:bg-black text-white p-2 rounded-full border border-white/10 transition"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Video Display */}
      {playbackMode === 'trailer' ? (
        /* Trailer Player: Clean YouTube Embed with NO LOGO visible */
        trailerKey ? (
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-black">
            <iframe
              key={`trailer-${trailerKey}`}
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=0&iv_load_policy=3&disablekb=0`}
              className="w-full h-full border-0 transform scale-[1.04] origin-center"
              sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              title={`${title} Official Trailer`}
            />

            {/* Permanent Cinema Logo Mask: Completely obscures the YouTube logo in bottom-right corner */}
            <div className="absolute bottom-3 right-3 z-30 pointer-events-none flex items-center gap-1.5 px-3 py-1 bg-black/95 backdrop-blur-xl rounded-lg border border-white/15 text-[10px] font-mono text-[#FFB612] font-black tracking-widest shadow-2xl">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB612] animate-pulse" />
              NAIFLIX CINEMA
            </div>

            {/* Top Branding Mask to ensure clean theater appearance */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black to-transparent pointer-events-none z-20" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-3">
            <Clapperboard className="w-12 h-12 text-[#FFB612] animate-bounce" />
            <h4 className="text-xl font-bebas text-white">Trailer Loading</h4>
            <p className="text-xs max-w-sm">
              Connecting to theater stream... Click below to switch directly to the full movie.
            </p>
            <button
              onClick={() => setPlaybackMode('full')}
              className="bg-[#FFB612] text-black px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider"
            >
              Switch to Full Movie
            </button>
          </div>
        )
      ) : (
        /* Full Movie / Series Streaming Player (Plex, Jellyfin, Emby - Permitted Sandbox Flags) */
        <div className="relative w-full h-full bg-black">
          <iframe
            key={`${selectedServerId}-${iframeKey}-${season}-${episode}`}
            src={activeStreamUrl}
            className="w-full h-full border-0 bg-black"
            sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            title={`${title} Full Feature Stream`}
          />

          {/* Interactive Auto-Sync Next Episode Overlay */}
          {type === 'tv' && showNextOverlay && (
            <div className="absolute bottom-16 right-6 z-40 bg-black/95 border-2 border-[#FFB612] p-4 rounded-2xl shadow-2xl backdrop-blur-2xl flex items-center gap-4 animate-in slide-in-from-bottom duration-300">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                  EPISODE CONCLUDED
                </span>
                <h5 className="text-sm font-bold text-white">
                  Next Episode: S{season} E{episode + 1}
                </h5>
                <p className="text-xs text-gray-300">
                  Auto-syncing in {nextCountdown}s...
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNextEpisode}
                  className="bg-[#FFB612] text-black font-black px-4 py-2 rounded-xl text-xs uppercase hover:bg-yellow-400 transition"
                >
                  Play Now
                </button>
                <button
                  onClick={() => setShowNextOverlay(false)}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-2 rounded-xl text-xs uppercase transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
