import React from 'react';
import { MovieItem } from '../types';
import { Play, Download, Radio, Clapperboard } from 'lucide-react';

interface HeroSectionProps {
  movie: MovieItem | null;
  onOpenDetails: (movie: MovieItem) => void;
  onOpenTrailer?: (movie: MovieItem) => void;
  onOpenDownload: (movie: MovieItem) => void;
}

const IMG_URL_ORIGINAL = 'https://image.tmdb.org/t/p/original';

export const HeroSection: React.FC<HeroSectionProps> = ({
  movie,
  onOpenDetails,
  onOpenTrailer,
  onOpenDownload,
}) => {
  if (!movie) {
    return (
      <header className="relative h-[85vh] w-full flex items-end pb-32 px-6 md:px-12 overflow-hidden bg-black animate-pulse">
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="h-24 bg-white/10 rounded-3xl w-3/4"></div>
          <div className="h-6 bg-white/5 rounded-xl w-1/2"></div>
        </div>
      </header>
    );
  }

  const title = movie.title || movie.name || 'Featured Movie';
  const overview = movie.overview || 'Experience this cinema feature in breathtaking 4K Ultra HD.';
  const backdropUrl = movie.backdrop_path
    ? `${IMG_URL_ORIGINAL}${movie.backdrop_path}`
    : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80';

  return (
    <header className="relative h-[85vh] min-h-[620px] w-full flex items-end pb-24 md:pb-32 px-6 md:px-12 overflow-hidden">
      {/* Background with Hero Mask */}
      <div id="heroBg" className="absolute inset-0 z-0">
        <img
          src={backdropUrl}
          alt={title}
          className="w-full h-full object-cover object-top opacity-70 filter saturate-125"
        />
        <div className="absolute inset-0 hero-mask" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl">
        {/* Badges */}
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-[#FFB612] text-black font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3 h-3 animate-pulse" />
            Ultra HD Stream
          </span>
          <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white font-mono text-xs px-3 py-1 rounded-full uppercase">
            Ultra HD 4K
          </span>
          {movie.release_date || movie.first_air_date ? (
            <span className="text-[#FFB612] font-black text-xs uppercase tracking-widest hidden sm:inline">
              {(movie.release_date || movie.first_air_date)?.substring(0, 4)} PREMIERE
            </span>
          ) : null}
        </div>

        {/* Huge Title (Bebas Neue) */}
        <h2
          id="heroTitle"
          className="text-6xl sm:text-8xl md:text-9xl mb-6 md:mb-8 leading-[0.85] uppercase font-bebas text-white tracking-wider drop-shadow-2xl"
        >
          {title}
        </h2>

        {/* Overview */}
        <p
          id="heroDesc"
          className="text-base md:text-xl text-gray-300 mb-8 md:mb-12 max-w-2xl font-light line-clamp-3 leading-relaxed drop-shadow"
        >
          {overview}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            id="heroPlayBtn"
            onClick={() => onOpenDetails(movie)}
            className="bg-[#FFB612] text-black px-8 md:px-12 py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm tracking-widest uppercase hover:scale-105 transition shadow-2xl shadow-yellow-600/30 flex items-center gap-2.5 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-black" />
            {movie.media_type === 'tv' || movie.first_air_date ? 'Stream Full Series' : 'Stream Full Movie'}
          </button>

          <button
            onClick={() => onOpenTrailer ? onOpenTrailer(movie) : onOpenDetails(movie)}
            className="glass-panel text-white hover:bg-white/10 px-6 md:px-8 py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm tracking-widest uppercase hover:border-[#FFB612] transition flex items-center gap-2 cursor-pointer"
          >
            <Clapperboard className="w-4 h-4 text-[#FFB612]" />
            Watch Trailer
          </button>

          <button
            onClick={() => onOpenDownload(movie)}
            className="glass-panel text-white hover:bg-white/10 px-6 md:px-8 py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm tracking-widest uppercase hover:border-[#FFB612] transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#FFB612]" />
            Download Now
          </button>
        </div>
      </div>
    </header>
  );
};
