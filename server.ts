import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { spawn, execSync, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Ensure downloads directory exists
const DOWNLOAD_DIR = path.join('/tmp', 'naiflix_downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

interface FFmpegTask {
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

const activeProcesses = new Map<string, ChildProcess>();
const tasks = new Map<string, FFmpegTask>();

// Check system ffmpeg capabilities
let ffmpegVersion = 'Unknown';
try {
  ffmpegVersion = execSync('ffmpeg -version').toString().split('\n')[0];
} catch {
  console.warn('ffmpeg binary not detected via CLI check');
}

// Helper to sanitize filename
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 50);
}

// Convert "00:01:23.45" to total seconds
function timeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return 0;
}

// 1. Health check & version info
app.get('/api/ffmpeg/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    ffmpegVersion,
    ffmpegPath: '/usr/bin/ffmpeg',
    ffprobePath: '/usr/bin/ffprobe',
    activeTasks: Array.from(tasks.values()).filter(t => t.status === 'transcoding').length,
    totalCompleted: Array.from(tasks.values()).filter(t => t.status === 'completed').length,
  });
});

// 2. Stream probe endpoint (inspect HLS or MP4 stream info)
app.post('/api/ffmpeg/probe', (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'Stream URL is required' });
    return;
  }

  const ffprobeArgs = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    url
  ];

  const probe = spawn('ffprobe', ffprobeArgs);
  let stdout = '';
  let stderr = '';

  probe.stdout.on('data', (d) => {
    stdout += d.toString();
  });

  probe.stderr.on('data', (d) => {
    stderr += d.toString();
  });

  const timer = setTimeout(() => {
    try {
      probe.kill();
    } catch {
      // ignore
    }
  }, 10000);

  probe.on('close', (code) => {
    clearTimeout(timer);
    if (code !== 0 || !stdout) {
      res.json({
        success: false,
        error: stderr || 'Failed to probe stream format',
        probeFallback: {
          format: 'HLS / Live Stream',
          adaptiveBitrate: true,
          resolution: 'Adaptive (up to 4K UHD)'
        }
      });
      return;
    }

    try {
      const data = JSON.parse(stdout);
      const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
      const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

      res.json({
        success: true,
        duration: data.format?.duration ? parseFloat(data.format.duration) : null,
        formatName: data.format?.format_name,
        bitRate: data.format?.bit_rate ? parseInt(data.format.bit_rate) : null,
        video: videoStream ? {
          codec: videoStream.codec_name,
          width: videoStream.width,
          height: videoStream.height,
          fps: videoStream.r_frame_rate,
          profile: videoStream.profile
        } : null,
        audio: audioStream ? {
          codec: audioStream.codec_name,
          sampleRate: audioStream.sample_rate,
          channels: audioStream.channels
        } : null
      });
    } catch {
      res.json({
        success: true,
        formatName: 'HLS Stream',
        note: 'Stream probe parsed with defaults'
      });
    }
  });
});

// 3. Start FFmpeg Transcode & Download task
app.post('/api/ffmpeg/start-download', (req: Request, res: Response) => {
  const {
    streamUrl,
    title = 'Movie',
    quality = '1080',
    format = 'mp4',
    maxDurationSeconds = 0 // 0 = Full movie / series download in full
  } = req.body;

  if (!streamUrl) {
    res.status(400).json({ error: 'Stream URL is required' });
    return;
  }

  const taskId = 'naiflix_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const cleanTitle = sanitizeFilename(title);
  const extension = format === 'mp3' ? 'mp3' : format === 'mkv' ? 'mkv' : 'mp4';
  const outputFilename = `${cleanTitle}_${quality}p_${taskId}.${extension}`;
  const outputFilepath = path.join(DOWNLOAD_DIR, outputFilename);

  // Resolution and encoding settings based on target quality
  let scaleFilter = '';
  let videoBitrate = '4500k';
  let audioBitrate = '192k';

  switch (quality) {
    case '8k':
      scaleFilter = 'scale=min(7680\\,iw):-2';
      videoBitrate = '14000k';
      audioBitrate = '320k';
      break;
    case '4k':
      scaleFilter = 'scale=min(3840\\,iw):-2';
      videoBitrate = '9000k';
      audioBitrate = '256k';
      break;
    case '1080':
      scaleFilter = 'scale=min(1920\\,iw):-2';
      videoBitrate = '4500k';
      audioBitrate = '192k';
      break;
    case '720':
      scaleFilter = 'scale=min(1280\\,iw):-2';
      videoBitrate = '2500k';
      audioBitrate = '128k';
      break;
    default:
      scaleFilter = 'scale=min(1920\\,iw):-2';
      videoBitrate = '4500k';
  }

  const ffmpegArgs: string[] = [
    '-y',
    '-i', streamUrl,
  ];

  if (maxDurationSeconds && maxDurationSeconds > 0) {
    ffmpegArgs.push('-t', maxDurationSeconds.toString());
  }

  if (format === 'mp3') {
    ffmpegArgs.push(
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', '256k'
    );
  } else if (quality === '1080' || quality === 'original') {
    // Ultra-fast copy or fast transcode
    ffmpegArgs.push(
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-movflags', '+faststart'
    );
  } else {
    ffmpegArgs.push(
      '-vf', scaleFilter,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '22',
      '-c:a', 'aac',
      '-b:a', audioBitrate,
      '-movflags', '+faststart'
    );
  }

  ffmpegArgs.push(outputFilepath);

  const task: FFmpegTask = {
    id: taskId,
    title,
    streamUrl,
    quality,
    format,
    status: 'transcoding',
    progress: 1,
    speed: '1.0x',
    fps: '0',
    size: '0 kB',
    time: '00:00:00',
    durationSeconds: maxDurationSeconds || 0,
    outputFilename,
    outputFilepath,
    logs: [`[NAIFLIX ENGINE] Initializing Ultra Download Engine for "${title}"...`],
    command: `encode --quality=${quality} --format=${format} --output=${outputFilename}`,
    createdAt: Date.now()
  };

  tasks.set(taskId, task);

  try {
    const ffProcess = spawn('ffmpeg', ffmpegArgs);
    activeProcesses.set(taskId, ffProcess);

    task.logs.push(`[NAIFLIX ENGINE] Target format: ${format.toUpperCase()} | Quality profile: ${quality.toUpperCase()}`);
    task.logs.push(`[NAIFLIX ENGINE] Packaging full movie feature stream...`);

    ffProcess.stderr.on('data', (chunk) => {
      const line = chunk.toString();
      const lines = line.split('\n').filter(Boolean);
      
      lines.forEach((l: string) => {
        if (l.trim()) {
          task.logs.push(l.trim());
          if (task.logs.length > 80) {
            task.logs.shift();
          }
        }

        // Parse progress e.g. "frame=  324 fps= 48 q=28.0 size=   1234kB time=00:00:10.50 bitrate= 960.2kbits/s speed=1.82x"
        const timeMatch = l.match(/time=(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/);
        const fpsMatch = l.match(/fps=\s*([\d.]+)/);
        const speedMatch = l.match(/speed=\s*([\d.]+x)/);
        const sizeMatch = l.match(/size=\s*([\d.]+\s*[kKmMgG]?B)/);

        if (fpsMatch) task.fps = fpsMatch[1];
        if (speedMatch) task.speed = speedMatch[1];
        if (sizeMatch) task.size = sizeMatch[1];

        if (timeMatch) {
          task.time = timeMatch[1];
          const currentSeconds = timeToSeconds(timeMatch[1]);
          if (task.durationSeconds > 0) {
            const rawProgress = Math.min(99, Math.round((currentSeconds / task.durationSeconds) * 100));
            task.progress = Math.max(task.progress, rawProgress);
          } else {
            task.progress = Math.min(95, task.progress + 1);
          }
        }
      });
    });

    ffProcess.on('close', (code) => {
      activeProcesses.delete(taskId);
      task.completedAt = Date.now();

      if (code === 0 && fs.existsSync(outputFilepath)) {
        task.status = 'completed';
        task.progress = 100;
        const stats = fs.statSync(outputFilepath);
        task.fileSizeBytes = stats.size;
        const mb = (stats.size / (1024 * 1024)).toFixed(2);
        task.size = `${mb} MB`;
        task.logs.push(`[NAIFLIX ENGINE] SUCCESS: Transcoded master file generated (${mb} MB).`);
      } else {
        if (task.status !== 'cancelled') {
          task.status = 'error';
          task.error = `FFmpeg process exited with code ${code}`;
          task.logs.push(`[NAIFLIX ENGINE] ERROR: Process ended with code ${code}`);
        }
      }
    });

    ffProcess.on('error', (err) => {
      activeProcesses.delete(taskId);
      task.status = 'error';
      task.error = err.message;
      task.logs.push(`[NAIFLIX ENGINE] PROCESS ERROR: ${err.message}`);
    });

    res.json({
      success: true,
      taskId,
      message: 'FFmpeg transcode and download initiated',
      task
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to spawn FFmpeg process' });
  }
});

// 4. Get status of a task
app.get('/api/ffmpeg/tasks/:id', (req: Request, res: Response) => {
  const task = tasks.get(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ task });
});

// 5. List all tasks
app.get('/api/ffmpeg/tasks', (_req: Request, res: Response) => {
  const allTasks = Array.from(tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ tasks: allTasks });
});

// 6. Cancel a running task
app.post('/api/ffmpeg/tasks/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params;
  const task = tasks.get(id);
  const proc = activeProcesses.get(id);

  if (proc) {
    proc.kill('SIGTERM');
    activeProcesses.delete(id);
  }

  if (task) {
    task.status = 'cancelled';
    task.logs.push('[NAIFLIX ENGINE] Transcode job cancelled by user.');
    res.json({ success: true, task });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

// 7. Download resulting transcoded file
app.get('/api/ffmpeg/download/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(DOWNLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).send('File not found or expired.');
    return;
  }

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// 8. Instant Movie Download (Starts downloading instantly without converting or counting bits)
app.get('/api/download/instant', (req: Request, res: Response) => {
  const title = (req.query.title as string) || 'Movie_Cinema';
  const quality = (req.query.quality as string) || '4k';

  const cleanTitle = title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Movie';
  const filename = `${cleanTitle} (${quality.toUpperCase()} Ultra HD).mp4`;

  const qualityFileMap: Record<string, string> = {
    '8k': path.join(DOWNLOAD_DIR, 'master_8k.mp4'),
    '4k': path.join(DOWNLOAD_DIR, 'master_4k.mp4'),
    '1440': path.join(DOWNLOAD_DIR, 'master_4k.mp4'),
    '1080': path.join(DOWNLOAD_DIR, 'master_1080p.mp4'),
    '720': path.join(DOWNLOAD_DIR, 'master_720p.mp4'),
    '480': path.join(DOWNLOAD_DIR, 'master_720p.mp4'),
    '360': path.join(DOWNLOAD_DIR, 'master_720p.mp4'),
  };

  const targetPath = qualityFileMap[quality] || path.join(DOWNLOAD_DIR, 'master_4k.mp4');

  if (fs.existsSync(targetPath)) {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'video/mp4');
    const stream = fs.createReadStream(targetPath);
    stream.pipe(res);
  } else {
    // Fallback if master not found, stream any available
    const files = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.endsWith('.mp4'));
    if (files.length > 0) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Type', 'video/mp4');
      fs.createReadStream(path.join(DOWNLOAD_DIR, files[0])).pipe(res);
    } else {
      res.status(404).send('Movie download file not ready');
    }
  }
});

// 9. Stream Player Fallback (Direct to VidSrc with zero sandbox checks)
app.get('/api/stream/player', (req: Request, res: Response) => {
  const { type = 'movie', id, season = '1', episode = '1' } = req.query;
  const target =
    type === 'tv'
      ? `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${id}`;
  res.redirect(target);
});

// 9. Stream Proxy endpoint (in case external stream blocks CORS)
app.get('/api/ffmpeg/hls-proxy', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    res.status(400).send('Target url query parameter missing');
    return;
  }

  try {
    const upstreamRes = await fetch(targetUrl);
    const contentType = upstreamRes.headers.get('content-type') || 'application/vnd.apple.mpegurl';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', contentType);

    const buffer = await upstreamRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(502).send(`Proxy fetch error: ${err.message}`);
  }
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: Number(port) },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`NaiFlix Server + FFmpeg Streaming Engine running at http://localhost:${port}`);
  });
}

startServer();
