import React, { useState, useEffect, useCallback } from 'react';
import { MovieItem, FFmpegTask } from './types';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { MovieGrid } from './components/MovieGrid';
import { MovieDetailModal } from './components/MovieDetailModal';
import { FFmpegDownloadModal } from './components/FFmpegDownloadModal';
import { FFmpegQueueDrawer } from './components/FFmpegQueueDrawer';
import { FloatingPlayer } from './components/FloatingPlayer';
import { HLS_CINEMA_STREAMS } from './data/hlsStreams';
import { Radio, HardDrive, Cpu, Film, Download } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

const API_KEY = '68ba09e7355a443a32a428981c6ea063';

export default function App() {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [heroMovie, setHeroMovie] = useState<MovieItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('for-you');
  const [categoryLabel, setCategoryLabel] = useState<string>('For You');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'full' | 'trailer'>('full');

  // Picture-in-Picture / Floating Player State
  const [pipMovie, setPipMovie] = useState<MovieItem | null>(null);
  const [pipSeason, setPipSeason] = useState<number>(1);
  const [pipEpisode, setPipEpisode] = useState<number>(1);
  const [pipMode, setPipMode] = useState<'full' | 'trailer'>('full');
  const [isPipOpen, setIsPipOpen] = useState<boolean>(false);

  // Download Modal
  const [downloadMovie, setDownloadMovie] = useState<MovieItem | null>(null);
  const [downloadQuality, setDownloadQuality] = useState<string>('4k');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);

  // Queue Drawer
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState<boolean>(false);
  const [activeDownloadsCount, setActiveDownloadsCount] = useState<number>(0);

  // Curated 4K Cinema fallback
  const getCinemaFeatures = (): MovieItem[] => {
    return HLS_CINEMA_STREAMS.map((s, idx) => ({
      id: 990000 + idx,
      title: s.title.replace(/\(HLS.*?\)/gi, '').replace(/\(.*?HLS.*?\)/gi, '').trim(),
      overview: s.description.replace(/HLS/gi, 'Ultra HD'),
      poster_path: null,
      backdrop_path: null,
      release_date: s.year,
      media_type: 'movie',
      vote_average: 9.6,
      hlsStreamUrl: s.url,
    }));
  };

  // Fetch movies by URL
  const fetchMovies = useCallback(async (url: string, fallbackToDefaults = true) => {
    setIsLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch from TMDB');
      const data = await res.json();
      const results: MovieItem[] = (data.results || []).filter(
        (m: any) => m.poster_path || m.backdrop_path
      );

      if (results.length > 0) {
        setMovies(results);
        setHeroMovie(results[0]);
      } else if (fallbackToDefaults) {
        const fallback = getCinemaFeatures();
        setMovies(fallback);
        setHeroMovie(fallback[0]);
      }
    } catch {
      const fallback = getCinemaFeatures();
      setMovies(fallback);
      if (fallback[0]) setHeroMovie(fallback[0]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial "For You"
  const loadInitialForYou = useCallback(() => {
    setCategoryLabel('For You');
    setActiveCategory('for-you');
    const randomPage = Math.floor(Math.random() * 5) + 1;
    fetchMovies(`https://api.themoviedb.org/3/trending/all/day?api_key=${API_KEY}&page=${randomPage}`);
  }, [fetchMovies]);

  useEffect(() => {
    loadInitialForYou();
  }, [loadInitialForYou]);

  // Search titles with debounce
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      setCategoryLabel(`Search: "${searchQuery}"`);
      const timer = setTimeout(() => {
        fetchMovies(
          `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(
            searchQuery.trim()
          )}`,
          false
        );
      }, 350);
      return () => clearTimeout(timer);
    } else if (searchQuery.trim().length === 0 && activeCategory === 'for-you') {
      loadInitialForYou();
    }
  }, [searchQuery, loadInitialForYou, fetchMovies, activeCategory]);

  // Check active background tasks count
  useEffect(() => {
    const checkTasks = async () => {
      try {
        const res = await fetch('/api/ffmpeg/tasks');
        if (res.ok) {
          const data = await res.json();
          const active = (data.tasks || []).filter((t: FFmpegTask) => t.status === 'transcoding');
          setActiveDownloadsCount(active.length);
        }
      } catch {
        // ignore
      }
    };

    checkTasks();
    const interval = setInterval(checkTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  // Category switch: for you, trending, 4k, top rated, action, horrors, sci-fi, romance
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setSearchQuery('');

    switch (category) {
      case 'for-you':
        loadInitialForYou();
        break;
      case 'trending':
        setCategoryLabel('Trending');
        fetchMovies(`https://api.themoviedb.org/3/trending/all/day?api_key=${API_KEY}`);
        break;
      case '4k':
        setCategoryLabel('4K');
        fetchMovies(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=vote_count.desc&vote_average.gte=7.5`);
        break;
      case 'top-rated':
        setCategoryLabel('Top Rated');
        fetchMovies(`https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}`);
        break;
      case 'action':
        setCategoryLabel('Action');
        fetchMovies(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=28&sort_by=popularity.desc`);
        break;
      case 'horrors':
        setCategoryLabel('Horrors');
        fetchMovies(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=27&sort_by=popularity.desc`);
        break;
      case 'sci-fi':
        setCategoryLabel('Sci-Fi');
        fetchMovies(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=878&sort_by=popularity.desc`);
        break;
      case 'romance':
        setCategoryLabel('Romance');
        fetchMovies(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=10749&sort_by=popularity.desc`);
        break;
      default:
        loadInitialForYou();
    }
  };

  const handleOpenDetails = (movie: MovieItem, mode: 'full' | 'trailer' = 'full') => {
    setSelectedMovie(movie);
    setModalMode(mode);
    setIsDetailModalOpen(true);
    // If opening full modal for current PIP movie, close PIP
    if (pipMovie?.id === movie.id) {
      setIsPipOpen(false);
    }
  };

  const handleOpenTrailer = (movie: MovieItem) => {
    setSelectedMovie(movie);
    setModalMode('trailer');
    setIsDetailModalOpen(true);
  };

  const handleOpenPip = (
    movie: MovieItem,
    season: number,
    episode: number,
    mode: 'full' | 'trailer'
  ) => {
    setPipMovie(movie);
    setPipSeason(season);
    setPipEpisode(episode);
    setPipMode(mode);
    setIsPipOpen(true);
  };

  const handleMaximizePip = () => {
    if (pipMovie) {
      setSelectedMovie(pipMovie);
      setModalMode(pipMode);
      setIsDetailModalOpen(true);
      setIsPipOpen(false);
    }
  };

  const [downloadNotification, setDownloadNotification] = useState<{
    show: boolean;
    title: string;
    quality: string;
  } | null>(null);

  const handleOpenDownload = (movie: MovieItem, quality = '4k') => {
    const title = movie.title || movie.name || 'Cinema_Feature';
    const downloadUrl = `/api/download/instant?title=${encodeURIComponent(title)}&quality=${quality}`;

    // Instant browser download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${title} (${quality.toUpperCase()}).mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setActiveDownloadsCount((c) => c + 1);

    setDownloadNotification({
      show: true,
      title,
      quality: quality.toUpperCase(),
    });

    setTimeout(() => {
      setDownloadNotification(null);
    }, 4500);
  };

  // Determine current stream URL for download modal
  const getStreamUrlForDownload = (movie: MovieItem | null) => {
    if (!movie) return HLS_CINEMA_STREAMS[0].url;
    if (movie.hlsStreamUrl) return movie.hlsStreamUrl;
    const streamPreset = HLS_CINEMA_STREAMS[(movie.id || 0) % HLS_CINEMA_STREAMS.length];
    return streamPreset.url;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#FFB612] selection:text-black">
      {/* Top Navigation */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onReset={loadInitialForYou}
        activeDownloadsCount={activeDownloadsCount}
        onOpenDownloadsQueue={() => setIsQueueDrawerOpen(true)}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* Hero Showcase */}
      <HeroSection
        movie={heroMovie}
        onOpenDetails={(m) => handleOpenDetails(m, 'full')}
        onOpenTrailer={handleOpenTrailer}
        onOpenDownload={(m) => handleOpenDownload(m, '4k')}
      />

      {/* Main Movie Grid */}
      <MovieGrid
        movies={movies}
        categoryTitle={categoryLabel}
        onOpenDetails={(m) => handleOpenDetails(m, 'full')}
        onOpenDownload={(m) => handleOpenDownload(m, '4k')}
        isLoading={isLoading}
      />

      {/* Movie Detail & Streaming Modal */}
      <MovieDetailModal
        movie={selectedMovie}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onOpenDownload={(m, q) => handleOpenDownload(m, q)}
        initialMode={modalMode}
        onOpenPip={handleOpenPip}
      />

      {/* Floating Picture-in-Picture Mini-Player */}
      <FloatingPlayer
        movie={pipMovie}
        season={pipSeason}
        episode={pipEpisode}
        mode={pipMode}
        activeServerUrl={
          pipMovie?.media_type === 'tv'
            ? `https://vidsrc.to/embed/tv/${pipMovie.id}/${pipSeason}/${pipEpisode}`
            : `https://vidsrc.to/embed/movie/${pipMovie?.id}`
        }
        isOpen={isPipOpen}
        onClose={() => setIsPipOpen(false)}
        onMaximize={handleMaximizePip}
        onNextEpisode={() => setPipEpisode((e) => e + 1)}
      />

      {/* Transcode & Download Modal */}
      <FFmpegDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        streamUrl={getStreamUrlForDownload(downloadMovie)}
        movieTitle={downloadMovie?.title || downloadMovie?.name || 'Cinema Feature'}
        initialQuality={downloadQuality}
        onTaskStarted={() => setActiveDownloadsCount((c) => c + 1)}
      />

      {/* Downloads History Drawer */}
      <FFmpegQueueDrawer
        isOpen={isQueueDrawerOpen}
        onClose={() => setIsQueueDrawerOpen(false)}
        onOpenTaskModal={(task) => {
          setDownloadMovie({
            id: 0,
            title: task.title,
            overview: '',
            poster_path: null,
            backdrop_path: null,
          });
          setDownloadQuality(task.quality);
          setIsDownloadModalOpen(true);
        }}
      />

      {/* Instant Download Toast Notification */}
      {downloadNotification?.show && (
        <div className="fixed bottom-8 right-8 z-[300] bg-black/95 border-2 border-[#FFB612] p-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom duration-300">
          <div className="bg-[#FFB612] text-black p-2.5 rounded-xl flex items-center justify-center">
            <Download className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#FFB612] text-[10px] font-mono uppercase tracking-wider font-bold">
                DOWNLOAD STARTED
              </span>
              <span className="bg-white/10 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                {downloadNotification.quality}
              </span>
            </div>
            <h5 className="font-bold text-white text-sm truncate max-w-xs">
              {downloadNotification.title}
            </h5>
            <p className="text-[11px] text-gray-300">
              Downloading directly to your device now!
            </p>
          </div>
        </div>
      )}

      {/* High-End Cinematic Footer */}
      <footer className="border-t border-white/10 py-16 px-6 md:px-12 bg-black/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl font-bebas tracking-[3px] text-white">
              NAI<span className="text-[#FFB612]">FLIX</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Ultra HD Global Cinema Streaming & High-Speed Pipeline
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
              <Radio className="w-3.5 h-3.5 text-[#FFB612] animate-pulse" />
              Adaptive Ultra HD Streaming
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Hardware Accelerated Transcoding
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
              <Film className="w-3.5 h-3.5 text-yellow-400" />
              8K & 4K Ultra HD Video Downloads
            </span>
          </div>

          <p className="text-[10px] text-gray-500 font-mono">
            © {new Date().getFullYear()} NaiFlix Ultra HD. All rights reserved.
          </p>
        </div>
      </footer>
      <Analytics />
    </div>
  );
}
