import { HlsStreamPreset } from '../types';

export const HLS_CINEMA_STREAMS: HlsStreamPreset[] = [
  {
    id: 'cosmos-4k',
    title: 'Cosmos Laundromat (4K Ultra HD)',
    genre: 'Sci-Fi / Animation',
    resolution: '4K Ultra HD & 1080p ABR',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    description: 'Blender Open Movie Project cinematic stream with adaptive bitrate HLS encoding and surround audio mix.',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    year: '2024 CINEMA'
  },
  {
    id: 'bunny-4k',
    title: 'Big Buck Bunny (Ultra HD Multi-Bitrate)',
    genre: 'Action / Comedy Animation',
    resolution: '1080p / 4K Scalable HLS',
    url: 'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,960x540_1200,1280x720_2400,1920x1080_3700,.f4v.csmil/master.m3u8',
    description: 'High dynamic range multi-bitrate HLS stream testing adaptive frame rate and continuous keyframes.',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
    year: '2023 4K REMASTER'
  },
  {
    id: 'tears-of-steel',
    title: 'Tears of Steel (Sci-Fi VFX Cinema)',
    genre: 'Sci-Fi / Cyberpunk',
    resolution: '1080p Ultra HD HLS with Multi-Audio',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    description: 'Dystopian future CGI live-action showcase with multi-track audio channels and pristine fragment segments.',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    year: '2024 DIRECTOR CUT'
  },
  {
    id: 'sintel-cinema',
    title: 'Sintel Cinema Original (HLS Broadcast)',
    genre: 'Fantasy / Adventure',
    resolution: '1080p Full HD Adaptive',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    description: 'High-definition fantasy quest featuring sweeping orchestral tracks and dynamic color grading.',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    year: '2024 RESTORATION'
  },
  {
    id: 'apple-hdr-bipbop',
    title: 'Apple HDR Reference Stream (Ultra HD)',
    genre: 'Ultra HD Benchmark',
    resolution: '4K UHD / 60 FPS HLS',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    description: 'Apple official reference streaming test suite evaluating segment latency and multi-rendition seamless transition.',
    poster: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1200&q=80',
    year: '2025 REFERENCE'
  }
];

export const DEFAULT_HLS_STREAM = HLS_CINEMA_STREAMS[0].url;
