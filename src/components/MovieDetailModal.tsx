import React, { useState } from 'react';
import { HlsPlayer } from './HlsPlayer';
import { MovieItem } from '../types';
import { HLS_CINEMA_STREAMS } from '../data/hlsStreams';
import { Play, Download, Sparkles, Sliders, ExternalLink, Film, Tv, Clapperboard, PictureInPicture } from 'lucide-react';

interface MovieDetailModalProps {
  movie: MovieItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenDownload: (movie: MovieItem, quality: string) => void;
  initialMode?: 'full' | 'trailer';
  onOpenPip?: (movie: MovieItem, season: number, episode: number, mode: 'full' | 'trailer') => void;
}

const IMG_URL_ORIGINAL = 'https://image.tmdb.org/t/p/original';

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  isOpen,
  onClose,
  onOpenDownload,
  initialMode = 'full',
  onOpenPip,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playerMode, setPlayerMode] = useState<'full' | 'trailer'>('full');
  const [selectedQuality, setSelectedQuality] = useState<string>('4k');
  const [customStreamUrl, setCustomStreamUrl] = useState<string>('');
  const [isEditingStream, setIsEditingStream] = useState<boolean>(false);
  const [season, setSeason] = useState<number>(1);
  const [episode, setEpisode] = useState<number>(1);

  if (!isOpen || !movie) return null;

  const isTv = movie.media_type === 'tv' || Boolean(movie.first_air_date && !movie.release_date);
  const title = movie.title || movie.name || 'Untitled Feature';
  const releaseDate = movie.release_date || movie.first_air_date || 'TBA';
  const posterPath = movie.backdrop_path
    ? `${IMG_URL_ORIGINAL}${movie.backdrop_path}`
    : movie.poster_path
    ? `${IMG_URL_ORIGINAL}${movie.poster_path}`
    : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80';

  const assignedStream =
    customStreamUrl.trim() ||
    movie.hlsStreamUrl ||
    HLS_CINEMA_STREAMS[(movie.id || 0) % HLS_CINEMA_STREAMS.length].url;

  const handleStartFullStream = (ep = episode) => {
    setEpisode(ep);
    setPlayerMode('full');
    setIsPlaying(true);
  };

  const handleStartTrailer = () => {
    setPlayerMode('trailer');
    setIsPlaying(true);
  };

  const handleClose = () => {
    setIsPlaying(false);
    onClose();
  };

  const directCinemaUrl = isTv
    ? `https://vidsrc.to/embed/tv/${movie.id}/${season}/${episode}`
    : `https://vidsrc.to/embed/movie/${movie.id}`;

  return (
    <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-full md:h-auto glass-panel rounded-[3rem] overflow-hidden flex flex-col lg:flex-row shadow-2xl border border-white/10">
        {/* Modal Controls: PIP & Close */}
        <div className="absolute top-6 right-6 z-[210] flex items-center gap-2">
          {onOpenPip && (
            <button
              onClick={() => {
                onOpenPip(movie, season, episode, playerMode);
                onClose();
              }}
              className="bg-white/10 hover:bg-[#FFB612] hover:text-black text-white w-12 h-12 flex items-center justify-center rounded-full transition shadow-lg backdrop-blur-md cursor-pointer"
              title="Mini Player / Picture-in-Picture (P)"
            >
              <PictureInPicture className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={handleClose}
            className="bg-white/10 hover:bg-red-600 text-white w-12 h-12 flex items-center justify-center rounded-full transition shadow-lg backdrop-blur-md cursor-pointer"
            title="Close Modal (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Video Player & Streaming Container (2/3 width on desktop) */}
        <div className="w-full lg:w-2/3 h-[380px] sm:h-[450px] lg:h-[650px] relative bg-black flex items-center justify-center">
          {isPlaying ? (
            <HlsPlayer
              streamUrl={assignedStream}
              posterUrl={posterPath}
              title={title}
              type={isTv ? 'tv' : 'movie'}
              tmdbId={movie.id}
              season={season}
              episode={episode}
              initialMode={playerMode}
              onSeasonChange={setSeason}
              onEpisodeChange={setEpisode}
              onRequestDownload={() => onOpenDownload(movie, selectedQuality)}
              onTogglePip={() => {
                if (onOpenPip) {
                  onOpenPip(movie, season, episode, playerMode);
                  onClose();
                }
              }}
            />
          ) : (
            <div className="relative w-full h-full overflow-hidden">
              <img
                src={posterPath}
                alt={title}
                className="w-full h-full object-cover opacity-90 transition duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

              {/* Just the Play and Clipper Icons */}
              <div className="absolute inset-0 flex items-center justify-center gap-6 z-10">
                {/* Big Stream Play Button */}
                <button
                  id="playBtnBig"
                  onClick={() => handleStartFullStream()}
                  className="bg-[#FFB612] text-black w-24 h-24 rounded-full font-black text-3xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 shadow-2xl shadow-yellow-600/50 group cursor-pointer border-2 border-yellow-300"
                  title={`Play Full ${isTv ? 'Series' : 'Movie'}`}
                >
                  <Play className="w-10 h-10 fill-black ml-1 group-hover:scale-110 transition" />
                </button>

                {/* Clipper / Clapperboard Icon */}
                <button
                  onClick={handleStartTrailer}
                  className="bg-black/60 hover:bg-[#FFB612] text-white hover:text-black w-20 h-20 rounded-full font-black text-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 backdrop-blur-md border-2 border-white/30 hover:border-[#FFB612] shadow-2xl group cursor-pointer"
                  title="Watch Trailer"
                >
                  <Clapperboard className="w-8 h-8 text-[#FFB612] group-hover:text-black transition" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Details & Controls Sidebar (1/3 width on desktop) */}
        <div className="w-full lg:w-1/3 p-6 md:p-10 lg:p-12 overflow-y-auto max-h-[650px] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#FFB612]/20 text-[#FFB612] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[#FFB612]/30 flex items-center gap-1">
                {isTv ? <Tv className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                {isTv ? 'TV SERIES' : 'CINEMA 4K'}
              </span>
              {movie.vote_average ? (
                <span className="text-gray-400 text-[10px] font-mono">
                  ★ {movie.vote_average.toFixed(1)} / 10
                </span>
              ) : null}
            </div>

            <h2 id="modalTitle" className="text-5xl md:text-6xl font-bebas font-bold mb-3 text-white uppercase leading-none tracking-wide">
              {title}
            </h2>

            <p id="modalFullDate" className="text-[#FFB612] font-extrabold text-xs mb-5 tracking-widest uppercase">
              RELEASE DATE: {releaseDate}
            </p>

            {/* TV Series Season & Episode Quick Picker */}
            {isTv && (
              <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                    Season & Episodes
                  </span>
                  <span className="text-[10px] font-mono text-[#FFB612]">
                    Watching S{season} : E{episode}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[9px] text-gray-400 uppercase block mb-1">Season</label>
                    <select
                      value={season}
                      onChange={(e) => {
                        setSeason(Number(e.target.value));
                        setEpisode(1);
                      }}
                      className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs font-bold text-white outline-none focus:border-[#FFB612]"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                        <option key={s} value={s} className="bg-black text-white">
                          Season {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-400 uppercase block mb-1">Episode</label>
                    <select
                      value={episode}
                      onChange={(e) => setEpisode(Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 p-2 rounded-xl text-xs font-bold text-[#FFB612] outline-none focus:border-[#FFB612]"
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((ep) => (
                        <option key={ep} value={ep} className="bg-black text-white">
                          Episode {ep}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Jump Episode Pills */}
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-500 uppercase block">Quick Jump:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((ep) => (
                      <button
                        key={ep}
                        onClick={() => handleStartFullStream(ep)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition ${
                          episode === ep
                            ? 'bg-[#FFB612] text-black'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        E{ep}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <h4 className="text-white/40 text-[10px] font-black uppercase mb-2 tracking-tighter">
              Overview
            </h4>
            <p id="modalDesc" className="text-gray-300 text-xs md:text-sm leading-relaxed mb-6 font-normal line-clamp-5">
              {movie.overview || 'No synopsis available for this feature.'}
            </p>

            {/* Ultra HD Quality Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white/40 text-[10px] font-black uppercase tracking-tighter">
                  Ultra HD Quality
                </h4>
                <span className="text-[10px] text-[#FFB612] font-mono">ULTRA HD CINEMA</span>
              </div>

              <select
                id="resSelect"
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-xs mb-3 outline-none focus:border-[#FFB612] font-bold text-white transition"
              >
                <option value="8k" className="bg-black text-white">8K CINEMA (ULTRA HD) - 18 Mbps</option>
                <option value="4k" className="bg-black text-white">4K ULTRA HIGH DEF - 9 Mbps</option>
                <option value="1440" className="bg-black text-white">1440p QUAD HD (2K) - 6 Mbps</option>
                <option value="1080" className="bg-black text-white">1080p FULL HD - 4.5 Mbps</option>
                <option value="720" className="bg-black text-white">720p HD - 2.5 Mbps</option>
                <option value="480" className="bg-black text-white">480p SD (DVD QUALITY) - 1.5 Mbps</option>
                <option value="360" className="bg-black text-white">360p MOBILE (DATA SAVER) - 0.8 Mbps</option>
              </select>

              {/* Download button */}
              <button
                onClick={() => onOpenDownload(movie, selectedQuality)}
                className="w-full glass-panel py-3.5 rounded-2xl text-[10px] font-black uppercase hover:bg-[#FFB612] hover:text-black hover:border-[#FFB612] transition tracking-widest text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Download className="w-3.5 h-3.5 text-[#FFB612] group-hover:text-black" />
                Download Full {isTv ? 'Episode' : 'Movie'} ({selectedQuality.toUpperCase()})
              </button>
            </div>
          </div>

          {/* Action buttons: Stream Full Movie vs Watch Trailer */}
          <div className="space-y-2.5 pt-2">
            {!isPlaying ? (
              <div className="space-y-2">
                <button
                  id="modalActionBtn"
                  onClick={() => handleStartFullStream()}
                  className="w-full bg-[#FFB612] hover:bg-yellow-400 text-black py-4 rounded-2xl font-black text-xs uppercase transition tracking-widest shadow-xl flex items-center justify-center gap-2 cursor-pointer shadow-yellow-600/30"
                >
                  <Play className="w-4 h-4 fill-black" />
                  Stream Full {isTv ? `Series (S${season}:E${episode})` : 'Movie'}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleStartTrailer}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-black text-xs uppercase transition tracking-wider border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Clapperboard className="w-3.5 h-3.5 text-[#FFB612]" />
                    Watch Trailer
                  </button>

                  <a
                    href={directCinemaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 bg-white/5 hover:bg-white/10 text-[#FFB612] border border-white/10 py-3 rounded-2xl font-black text-xs uppercase transition tracking-wider flex items-center gap-1.5 shrink-0"
                    title="Open Full Screen Cinema Window"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Cinema Tab
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPlaying(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3.5 rounded-2xl font-black text-xs uppercase transition tracking-widest border border-white/10"
                >
                  Back to Poster
                </button>
                <a
                  href={directCinemaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 bg-[#FFB612] hover:bg-yellow-400 text-black py-3.5 rounded-2xl font-black text-xs uppercase transition tracking-wider flex items-center gap-1.5 shrink-0"
                  title="Open In Full Cinema Window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Cinema Tab
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
