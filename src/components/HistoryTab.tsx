'use client';

import { Calendar, Trash2, ChevronRight, Activity, Moon, Clock, Flame, Navigation } from 'lucide-react';
import { ParsedActivity } from '../utils/tcxParser';

interface HistoryTabProps {
  activities: ParsedActivity[];
  onSelect: (activity: ParsedActivity) => void;
  onDelete: (id: string) => void;
  selectedId?: string;
}

export default function HistoryTab({ activities, onSelect, onDelete, selectedId }: HistoryTabProps) {
  
  const formatDuration = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.round(totalSeconds % 60);
    return `${hrs > 0 ? hrs + ':' : ''}${hrs > 0 && mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <div className="h-16 w-16 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-600 mb-4">
          <Calendar className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-zinc-300">No Runs Found</h3>
        <p className="text-xs text-zinc-500 max-w-xs mt-1">
          Upload your Garmin TCX files in the Import tab to begin tracking your workout history offline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <div>
          <h3 className="text-base font-bold text-zinc-200">Activity History</h3>
          <p className="text-[11px] text-zinc-500">Persisted locally on your phone</p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-900 text-zinc-400 border border-zinc-800">
          {activities.length} {activities.length === 1 ? 'Run' : 'Runs'}
        </span>
      </div>

      <div className="space-y-3">
        {activities.map((act) => {
          const isSelected = act.id === selectedId;
          return (
            <div
              key={act.id}
              className={`rounded-2xl border p-4 transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-cyan-950/20 border-cyan-500/60 shadow-lg shadow-cyan-950/10'
                  : 'bg-zinc-900/60 border-zinc-800/80 active:bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              {/* Tap container for selecting run */}
              <div 
                onClick={() => onSelect(act)}
                className="cursor-pointer pr-10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                    act.notes === 'Treadmill' 
                      ? 'bg-purple-950/60 text-purple-400 border border-purple-900/50' 
                      : 'bg-cyan-950/60 text-cyan-400 border border-cyan-900/50'
                  }`}>
                    {act.notes || act.sport}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-semibold font-mono">
                    {formatDate(act.startTime)} @ {formatTime(act.startTime)}
                  </span>
                </div>

                <h4 className="text-sm font-extrabold text-zinc-200 mb-3 group-hover:text-zinc-100 transition-colors">
                  {act.notes === 'Treadmill' ? 'Indoor Treadmill Run' : 'Outdoor Cardio Run'}
                </h4>

                {/* Primary Stats Grid */}
                <div className="grid grid-cols-4 gap-2 border-t border-zinc-850/60 pt-3">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase block tracking-wider">Dist</span>
                    <span className="text-xs font-black text-zinc-300 font-mono">{act.summary.totalDistanceKm} <span className="text-[9px] text-zinc-500 font-normal">km</span></span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase block tracking-wider">Time</span>
                    <span className="text-xs font-black text-zinc-300 font-mono">{formatDuration(act.summary.totalTimeSec)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase block tracking-wider">Pace</span>
                    <span className="text-xs font-black text-zinc-300 font-mono">{act.summary.avgPaceMinKm}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase block tracking-wider">Avg HR</span>
                    <span className="text-xs font-black text-rose-400 font-mono">{act.summary.avgHeartRate || '--'} <span className="text-[9px] text-zinc-500 font-normal">bpm</span></span>
                  </div>
                </div>
              </div>

              {/* Action Button Container */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this run? This cannot be undone.')) {
                      onDelete(act.id);
                    }
                  }}
                  className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 active:bg-rose-500/10 hover:bg-zinc-800 transition-all cursor-pointer"
                  title="Delete Run"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronRight 
                  onClick={() => onSelect(act)}
                  className="h-5 w-5 text-zinc-600 group-hover:text-zinc-400 transition-colors cursor-pointer" 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
