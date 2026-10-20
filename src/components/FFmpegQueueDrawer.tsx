import React, { useEffect, useState } from 'react';
import { X, Download, HardDrive, RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { FFmpegTask } from '../types';

interface FFmpegQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTaskModal: (task: FFmpegTask) => void;
}

export const FFmpegQueueDrawer: React.FC<FFmpegQueueDrawerProps> = ({
  isOpen,
  onClose,
  onOpenTaskModal,
}) => {
  const [tasks, setTasks] = useState<FFmpegTask[]>([]);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/ffmpeg/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
      const interval = setInterval(fetchTasks, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-md flex justify-end">
      <div className="w-full max-w-md bg-[#0a0a0a] border-l border-white/10 h-full p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FFB612]/20 flex items-center justify-center text-[#FFB612]">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bebas text-white tracking-wider">DOWNLOADS MANAGER</h3>
                <p className="text-[10px] text-gray-400 font-mono">
                  {tasks.length} total downloads registered
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List of Tasks */}
          <div className="py-4 space-y-3 overflow-y-auto max-h-[calc(100vh-180px)]">
            {tasks.length === 0 ? (
              <div className="text-center py-16 text-gray-500 space-y-2">
                <HardDrive className="w-10 h-10 mx-auto opacity-30 text-[#FFB612]" />
                <p className="text-xs uppercase font-mono tracking-wider">No active or completed downloads</p>
                <p className="text-[11px] text-gray-600">Select any movie and click "Download Now" to begin.</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-white truncate">{task.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                        <span className="text-[#FFB612] font-bold uppercase">{task.quality}p</span>
                        <span>•</span>
                        <span className="uppercase">{task.format}</span>
                        {task.size && <span>• {task.size}</span>}
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : task.status === 'transcoding'
                          ? 'bg-[#FFB612]/20 text-[#FFB612] border border-[#FFB612]/30 flex items-center gap-1'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {task.status === 'transcoding' && <RotateCw className="w-2.5 h-2.5 animate-spin" />}
                      {task.status === 'transcoding' ? 'Packaging' : task.status}
                    </span>
                  </div>

                  {/* Progress bar if transcoding */}
                  {task.status === 'transcoding' && (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FFB612] transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-gray-400">
                        <span>Speed: {task.speed || '1.0x'}</span>
                        <span>{task.progress}%</span>
                      </div>
                    </div>
                  )}

                  {/* Download button if completed */}
                  <div className="flex items-center gap-2 pt-1">
                    {task.status === 'completed' && (
                      <a
                        href={`/api/ffmpeg/download/${task.outputFilename}`}
                        download={task.outputFilename}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#FFB612] hover:bg-yellow-400 text-black font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Save File ({task.size})
                      </a>
                    )}
                    <button
                      onClick={() => onOpenTaskModal(task)}
                      className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase tracking-wider transition"
                    >
                      View Status
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 text-center">
          <p className="text-[10px] text-gray-500 font-mono">
            High-speed hardware accelerated processing
          </p>
        </div>
      </div>
    </div>
  );
};
