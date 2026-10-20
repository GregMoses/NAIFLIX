import React from 'react';
import { MovieItem } from '../types';
import { Play, Download, Radio, Film, Tv } from 'lucide-react';

interface MovieGridProps {
  movies: MovieItem[];
  categoryTitle: string;
  onOpenDetails: (movie: MovieItem) => void;
  onOpenDownload: (movie: MovieItem) => void;
  isLoading?: boolean;
}

const IMG_URL_780 = 'https://image.tmdb.org/t/p/w780';

export const MovieGrid: React.FC<MovieGridProps> = ({
  movies,
  categoryTitle,
  onOpenDetails,
  onOpenDownload,
  isLoading = false,
}) => {
  return (
    <main className="relative z-10 px-6 sm:px-10 md:px-12 mt-12 md:mt-16 pb-48">
      {/* Category Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12 md:mb-16">
        <div>
          <span className="text-[#FFB612] font-mono text-xs uppercase tracking-widest block mb-1">
            ULTRA HD CINEMA CATALOG
          </span>
          <h3
            id="categoryLabel"
            className="text-5xl md:text-6xl tracking-[6px] uppercase font-bebas text-white"
          >
            {categoryTitle}
          </h3>
        </div>
        <div className="text-xs text-gray-400 font-mono">
          Showing <span className="text-[#FFB612] font-bold">{movies.length}</span> titles in Ultra HD Quality
        </div>
      </div>

      {/* Grid: Exactly 3 Columns for larger display on desktop */}
      <div
        id="movieGrid"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-16"
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="movie-card relative overflow-hidden h-[600px] bg-white/5 animate-pulse rounded-[2rem]"
              />
            ))
          : movies.map((m) => {
              const title = m.title || m.name || 'Untitled Feature';
              const release = m.release_date || m.first_air_date || 'TBA';
              const isTv = m.media_type === 'tv' || Boolean(m.first_air_date && !m.release_date);
              const poster = m.poster_path
                ? `${IMG_URL_780}${m.poster_path}`
                : m.backdrop_path
                ? `${IMG_URL_780}${m.backdrop_path}`
                : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=780&q=80';

              return (
                <div
                  key={m.id}
                  onClick={() => onOpenDetails(m)}
                  className="movie-card group relative overflow-hidden cursor-pointer"
                >
                  <div className="relative h-[550px] sm:h-[600px]">
                    <img
                      src={poster}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 filter group-hover:brightness-110"
                    />

                    {/* Gradient Mask */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-95 group-hover:opacity-90 transition-opacity" />

                    {/* Quality Badges at Top */}
                    <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                      <span className="bg-black/60 backdrop-blur-md text-[#FFB612] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-[#FFB612]/30 flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5 animate-pulse" />
                        {isTv ? 'SERIES' : 'ULTRA HD'}
                      </span>
                      {m.vote_average ? (
                        <span className="bg-black/60 backdrop-blur-md text-white font-mono text-[10px] px-2.5 py-1 rounded-full border border-white/10">
                          ★ {m.vote_average.toFixed(1)}
                        </span>
                      ) : null}
                    </div>

                    {/* Hover Quick Actions */}
                    <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-black/40 backdrop-blur-[2px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetails(m);
                        }}
                        className="pointer-events-auto bg-[#FFB612] hover:bg-yellow-400 text-black p-4 rounded-full font-black shadow-2xl transition hover:scale-110"
                        title={isTv ? 'Stream Full Series' : 'Stream Full Movie'}
                      >
                        <Play className="w-6 h-6 fill-black ml-0.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDownload(m);
                        }}
                        className="pointer-events-auto bg-black/80 hover:bg-black text-[#FFB612] border border-[#FFB612] p-4 rounded-full font-black shadow-2xl transition hover:scale-110"
                        title="Download Now"
                      >
                        <Download className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Card Footer: Exact Bebas Neue Title & Date */}
                    <div className="absolute bottom-10 left-10 right-10">
                      <h4 className="movie-title text-4xl sm:text-5xl mb-2 text-white leading-none tracking-wide drop-shadow-md">
                        {title}
                      </h4>
                      <div className="flex items-center justify-between">
                        <p className="text-[#FFB612] font-black text-xs sm:text-sm tracking-widest uppercase">
                          {release}
                        </p>
                        <span className="text-[10px] font-mono text-gray-400 uppercase group-hover:text-white transition">
                          Ultra HD Cinema →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </main>
  );
};
