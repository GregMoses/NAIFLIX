export interface MovieItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  media_type?: 'movie' | 'tv';
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  hlsStreamUrl?: string;
}

export interface FFmpegTask {
  id: string;
  title: string;
  streamUrl: string;
  quality: string;
  format: string;
  status: 'queued' | 'transcoding' | 'completed' | 'error' | 'cancelled';
  progress: number;
  speed: string;
  fps: string;
  size: string;
  time: string;
  durationSeconds: number;
  outputFilename: string;
  outputFilepath: string;
  fileSizeBytes?: number;
  logs: string[];
  error?: string;
  command?: string;
  createdAt: number;
  completedAt?: number;
}

export interface StreamQualityLevel {
  id: number;
  height: number;
  width: number;
  bitrate: number;
  name: string;
}

export interface HlsStreamPreset {
  id: string;
  title: string;
  genre: string;
  resolution: string;
  url: string;
  description: string;
  poster: string;
  year: string;
}
