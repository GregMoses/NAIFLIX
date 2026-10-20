import React from 'react';
import { Search, HardDrive, Film } from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onReset: () => void;
  activeDownloadsCount: number;
  onOpenDownloadsQueue: () => void;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onReset,
  activeDownloadsCount,
  onOpenDownloadsQueue,
  activeCategory,
  onCategoryChange,
}) => {
  const categories = [
    { id: 'for-you', label: 'For You' },
    { id: 'trending', label: 'Trending' },
    { id: '4k', label: '4K' },
    { id: 'top-rated', label: 'Top Rated' },
    { id: 'action', label: 'Action' },
    { id: 'horrors', label: 'Horrors' },
    { id: 'sci-fi', label: 'Sci-Fi' },
    { id: 'romance', label: 'Romance' },
  ];

  return (
    <nav className="fixed top-0 w-full z-[100] px-6 md:px-12 py-5 flex flex-col md:flex-row items-center justify-between gap-4 glass-panel border-x-0 border-t-0 bg-black/75 backdrop-blur-3xl transition-all">
      <div className="flex items-center justify-between w-full md:w-auto gap-8">
        <h1
          className="text-4xl tracking-[4px] cursor-pointer font-bebas text-white select-none hover:opacity-90 transition flex items-center gap-1.5"
          onClick={onReset}
        >
          NAI<span className="text-[#FFB612]">FLIX</span>
          <span className="hidden sm:inline-block text-[9px] uppercase tracking-normal font-sans bg-[#FFB612]/20 text-[#FFB612] px-2 py-0.5 rounded-full border border-[#FFB612]/40 ml-1.5">
            Ultra HD 4K
          </span>
        </h1>

        {/* Mobile Downloads Button */}
        <button
          onClick={onOpenDownloadsQueue}
          className="md:hidden relative p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white"
        >
          <HardDrive className="w-4 h-4 text-[#FFB612]" />
          {activeDownloadsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#FFB612] text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {activeDownloadsCount}
            </span>
          )}
        </button>
      </div>

      {/* Category Pills (Middle Desktop) */}
      <div className="hidden lg:flex items-center gap-2 overflow-x-auto py-1">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onCategoryChange(c.id)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${
              activeCategory === c.id
                ? 'bg-[#FFB612] text-black shadow-lg shadow-yellow-500/20'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search Input & Downloads Button */}
      <div className="flex items-center gap-4 w-full md:w-auto justify-end">
        <div className="relative w-full md:w-80 lg:w-96">
          <input
            id="searchInput"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="SEARCH TITLES..."
            className="w-full bg-white/5 border border-white/10 px-8 py-3 rounded-full text-[10px] outline-none focus:border-[#FFB612] text-white placeholder-gray-500 font-black tracking-widest transition"
          />
          <Search className="w-3.5 h-3.5 absolute right-4 top-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Downloads Queue Button Desktop */}
        <button
          onClick={onOpenDownloadsQueue}
          className="hidden md:flex items-center gap-2 px-4 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-wider transition whitespace-nowrap"
          title="Open Downloads Manager"
        >
          <HardDrive className="w-3.5 h-3.5 text-[#FFB612]" />
          <span>Downloads</span>
          {activeDownloadsCount > 0 && (
            <span className="bg-[#FFB612] text-black text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
              {activeDownloadsCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};
