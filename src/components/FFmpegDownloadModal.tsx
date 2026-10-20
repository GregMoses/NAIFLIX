import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Terminal,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  HardDrive,
  Film,
  Zap,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { FFmpegTask } from '../types';

interface FFmpegDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamUrl: string;
  movieTitle: string;
  initialQuality?: string;
  onTaskStarted?: (task: FFmpegTask) => void;
}

export const FFmpegDownloadModal: React.FC<FFmpegDownloadModalProps> = ({
  isOpen,
  onClose,
  streamUrl,
  movieTitle,
  initialQuality = '4k',
  onTaskStarted,
}) => {
  const [quality, setQuality] = useState<string>(initialQuality);
  const [format, setFormat] = useState<string>('mp4');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTask, setActiveTask] = useState<FFmpegTask | null>(null);
  const [showLogs, setShowLogs] = useState<boolean>(true);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  // Poll task status if active
  useEffect(() => {
    if (!activeTask || activeTask.status === 'completed' || activeTask.status === 'error' || activeTask.status === 'cancelled') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ffmpeg/tasks/${activeTask.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.task) {
            setActiveTask(data.task);
            if (onTaskStarted) onTaskStarted(data.task);
          }
        }
      } catch {
        // ignore
      }
    }, 900);

    return () => clearInterval(interval);
  }, [activeTask, onTaskStarted]);

  // Auto scroll terminal log to bottom
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [activeTask?.logs]);

  if (!isOpen) return null;

  const startDownloadJob = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/ffmpeg/start-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamUrl,
          title: movieTitle,
          quality,
          format,
          maxDurationSeconds: 0, // 0 = Full movie / series download in full
        }),
      });

      const data = await res.json();
      if (data.success && data.task) {
        setActiveTask(data.task);
        if (onTaskStarted) onTaskStarted(data.task);
      } else {
        alert(data.error || 'Failed to start download task.');
      }
    } catch (err: any) {
      alert(`Error starting download: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelJob = async () => {
    if (!activeTask) return;
    try {
      await fetch(`/api/ffmpeg/tasks/${activeTask.id}/cancel`, { method: 'POST' });
      setActiveTask((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
    } catch {
      // ignore
    }
  };

  // Filter logs to remove any internal tool keywords
  const sanitizeLog = (str: string) => {
    return str
      .replace(/ffmpeg/gi, 'transcoder')
      .replace(/ffprobe/gi, 'analyzer')
      .replace(/hls/gi, 'stream');
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl glass-panel rounded-[2.5rem] p-6 md:p-10 border border-[#FFB612]/30 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFB612]/20 border border-[#FFB612] flex items-center justify-center text-[#FFB612]">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-3xl font-bebas tracking-wider text-white flex items-center gap-2">
                ULTRA DOWNLOAD ENGINE
                <span className="text-[10px] bg-[#FFB612] text-black font-black px-2.5 py-0.5 rounded-full font-sans tracking-normal">
                  FULL CINEMA FEATURE
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-medium truncate max-w-md">
                Packaging Full Movie: <span className="text-[#FFB612] font-bold">{movieTitle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {!activeTask || activeTask.status === 'cancelled' ? (
            /* Configure Settings Screen */
            <div className="space-y-6">
              {/* Quality Preset */}
              <div>
                <label className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2 block flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-[#FFB612]" />
                  Select Ultra HD Resolution
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[
                    { id: '8k', label: '8K ULTRA HD', sub: 'HEVC / 18 Mbps', badge: 'CINEMA' },
                    { id: '4k', label: '4K ULTRA HD', sub: '2160p / 9 Mbps', badge: 'UHD' },
                    { id: '1440', label: '1440p QUAD HD', sub: '1440p / 6 Mbps', badge: '2K' },
                    { id: '1080', label: '1080p FULL HD', sub: '1080p / 4.5 Mbps', badge: 'PRO' },
                    { id: '720', label: '720p HD', sub: '720p / 2.5 Mbps', badge: 'FAST' },
                    { id: '480', label: '480p SD', sub: '480p / 1.5 Mbps', badge: 'DVD' },
                    { id: '360', label: '360p MOBILE', sub: '360p / 0.8 Mbps', badge: 'SAVER' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setQuality(q.id)}
                      className={`p-3.5 rounded-2xl border text-left transition relative overflow-hidden ${
                        quality === q.id
                          ? 'bg-[#FFB612]/15 border-[#FFB612] shadow-lg shadow-yellow-500/10'
                          : 'bg-white/5 border-white/10 hover:border-white/30 text-gray-400'
                      }`}
                    >
                      <div className="text-sm font-black text-white">{q.label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{q.sub}</div>
                      <span className={`absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded ${
                        quality === q.id ? 'bg-[#FFB612] text-black' : 'bg-white/10 text-gray-400'
                      }`}>
                        {q.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format & Container */}
              <div>
                <label className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2 block flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#FFB612]" />
                  Format & Packaging
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'mp4', name: 'MP4 Universal', note: 'Standard Video Ultra HD' },
                    { id: 'mkv', name: 'MKV Cinema', note: 'Full Multi-Track Container' },
                    { id: 'mp3', name: 'MP3 Soundtrack', note: 'Original Audio Stream' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setFormat(fmt.id)}
                      className={`p-3 rounded-2xl border text-center transition ${
                        format === fmt.id
                          ? 'bg-[#FFB612] text-black font-black border-[#FFB612]'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30 font-semibold'
                      }`}
                    >
                      <div className="text-xs uppercase">{fmt.name}</div>
                      <div className="text-[9px] opacity-75">{fmt.note}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Download Guarantee Banner */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs text-gray-300">
                  <span className="text-white font-bold block">Full Feature Guarantee</span>
                  This downloads the complete full-length movie without cuts or duration caps.
                </div>
              </div>
            </div>
          ) : (
            /* Active Progress Screen */
            <div className="space-y-6">
              {/* Progress Card */}
              <div className="bg-black/60 border border-white/10 p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {activeTask.status === 'completed' ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    ) : activeTask.status === 'error' ? (
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                    ) : (
                      <RotateCw className="w-8 h-8 text-[#FFB612] animate-spin" />
                    )}
                    <div>
                      <div className="text-lg font-bebas tracking-wider text-white uppercase">
                        {activeTask.status === 'completed'
                          ? 'COMPLETE & READY TO SAVE'
                          : activeTask.status === 'error'
                          ? 'PACKAGING FAILED'
                          : 'PACKAGING FULL MOVIE IN ULTRA HD...'}
                      </div>
                      <div className="text-xs text-gray-400 font-mono-code">
                        Quality: {activeTask.quality.toUpperCase()} • Format: {activeTask.format.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-bebas text-[#FFB612] tracking-wider">
                      {activeTask.progress}%
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono-code">
                      Speed: {activeTask.speed || '1.0x'}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 via-[#FFB612] to-amber-300 transition-all duration-300 rounded-full shadow-lg shadow-yellow-500/50"
                    style={{ width: `${activeTask.progress}%` }}
                  />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px] font-mono-code">
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <span className="text-gray-500 block text-[9px] uppercase">Processed Time</span>
                    <span className="text-white font-bold">{activeTask.time || '00:00:00'}</span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <span className="text-gray-500 block text-[9px] uppercase">Render Speed</span>
                    <span className="text-[#FFB612] font-bold">{activeTask.speed || '1.0x'}</span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <span className="text-gray-500 block text-[9px] uppercase">Current FPS</span>
                    <span className="text-white font-bold">{activeTask.fps || '0'} fps</span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <span className="text-gray-500 block text-[9px] uppercase">File Size</span>
                    <span className="text-emerald-400 font-bold">{activeTask.size || 'Packaging...'}</span>
                  </div>
                </div>
              </div>

              {/* Action When Completed */}
              {activeTask.status === 'completed' && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-8 h-8 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-base font-bold text-white">Full Feature Ready For Download</h4>
                      <p className="text-xs text-gray-300">
                        {activeTask.outputFilename} ({activeTask.size})
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/api/ffmpeg/download/${activeTask.outputFilename}`}
                    download={activeTask.outputFilename}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#FFB612] hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition shadow-xl shadow-yellow-500/20"
                  >
                    <Download className="w-4 h-4" />
                    Save Full Movie Now
                  </a>
                </div>
              )}

              {/* Terminal Logs Toggle */}
              <div>
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white mb-2 transition"
                >
                  <Terminal className="w-3.5 h-3.5 text-[#FFB612]" />
                  {showLogs ? 'Hide Live Terminal Console' : 'Show Live Status Console'}
                </button>

                {showLogs && (
                  <div
                    ref={logTerminalRef}
                    className="w-full h-44 bg-black/95 rounded-2xl p-4 font-mono-code text-[11px] text-gray-300 overflow-y-auto border border-white/10 space-y-1"
                  >
                    {activeTask.logs.map((log, i) => (
                      <div
                        key={i}
                        className={
                          log.includes('SUCCESS')
                            ? 'text-emerald-400 font-bold'
                            : log.includes('ERROR')
                            ? 'text-red-400 font-bold'
                            : log.includes('fps=')
                            ? 'text-cyan-300'
                            : 'text-gray-400'
                        }
                      >
                        {sanitizeLog(log)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-[11px] text-gray-400 font-mono">
            Output: <span className="text-[#FFB612] uppercase font-bold">{format}</span> • {quality.toUpperCase()} FULL
          </div>

          <div className="flex items-center gap-3">
            {activeTask && activeTask.status === 'transcoding' ? (
              <button
                onClick={cancelJob}
                className="px-6 py-3 rounded-2xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white text-xs font-black uppercase tracking-wider transition border border-red-500/30"
              >
                Cancel Packaging
              </button>
            ) : null}

            {activeTask && activeTask.status === 'completed' ? (
              <button
                onClick={() => setActiveTask(null)}
                className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider transition"
              >
                Package Another Resolution
              </button>
            ) : null}

            {!activeTask || activeTask.status === 'cancelled' ? (
              <button
                onClick={startDownloadJob}
                disabled={isSubmitting}
                className="px-8 py-4 rounded-2xl bg-[#FFB612] hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-widest flex items-center gap-2 transition disabled:opacity-50 shadow-xl shadow-yellow-500/20"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Packaging Stream...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Full Movie
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
