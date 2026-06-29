'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, HelpCircle, RefreshCw, Trash2 } from 'lucide-react';
import { parseTCX } from '../utils/tcxParser';

interface ImportTabProps {
  onImportSuccess: (file: File) => Promise<void>;
  onResetData: () => void;
  onLoadSample: () => void;
}

export default function ImportTab({ onImportSuccess, onResetData, onLoadSample }: ImportTabProps) {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.tcx')) {
      setStatus({
        type: 'error',
        message: 'Unsupported format. Please select a .tcx (Training Center XML) file.',
      });
      return;
    }

    setLoading(true);
    setStatus({ type: 'idle', message: '' });

    try {
      await onImportSuccess(file);
      setStatus({
        type: 'success',
        message: `Successfully imported "${file.name}"! Open the Dashboard or History tab to view details.`,
      });
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: 'error',
        message: err.message || 'Failed to parse TCX file. Check file format and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-zinc-200">Import & Sync</h3>
        <p className="text-[11px] text-zinc-500">Upload fitness files or manage local offline storage</p>
      </div>

      {/* Drag & Drop Zone */}
      <form
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
          dragActive
            ? 'border-cyan-500 bg-cyan-500/5'
            : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".tcx"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className={`p-4 rounded-full bg-zinc-950 border border-zinc-850 mb-3 text-cyan-400 ${loading ? 'animate-bounce' : ''}`}>
          <UploadCloud className="h-6 w-6" />
        </div>

        <p className="text-xs font-bold text-zinc-200">
          {loading ? 'Reading file...' : 'Choose a .tcx file'}
        </p>
        <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] leading-normal">
          Drag and drop here, or tap to browse your phone's storage
        </p>
      </form>

      {/* Status Alert */}
      {status.type !== 'idle' && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 text-xs leading-normal ${
            status.type === 'success'
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-400'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <p className="font-semibold">{status.message}</p>
        </div>
      )}

      {/* How to Get TCX Files Guide */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
        <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-cyan-400" />
          Where to get TCX files?
        </h4>
        <ul className="list-disc pl-4 space-y-2 text-[10px] text-zinc-400 leading-relaxed font-semibold">
          <li>
            <span className="text-zinc-200">Amazfit / Zepp</span>: Open workout history in the Zepp app, select a run, tap Share/Options, and export as GPX/TCX.
          </li>
          <li>
            <span className="text-zinc-200">Garmin Connect</span>: Open Garmin Connect Web on your phone, click on a workout, click the gear icon, and select "Export to TCX".
          </li>
          <li>
            <span className="text-zinc-200">Strava</span>: Open Strava on mobile browser, view an activity, click "Export TCX" in the options panel.
          </li>
        </ul>
      </div>

      {/* Local Storage Controls */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-zinc-300">Offline Storage Settings</h4>
          <p className="text-[9px] text-zinc-500 mt-0.5 leading-normal">
            Velocity runs 100% locally. Your workout telemetry never leaves this smartphone.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              if (confirm('Load sample workout to see the dashboard in action?')) {
                onLoadSample();
                setStatus({ type: 'success', message: 'Sample workout loaded successfully!' });
              }
            }}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 active:scale-98 transition-all text-xs text-zinc-300 font-bold cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 text-cyan-400" />
            Load Sample Treadmill Run
          </button>
          
          <button
            onClick={() => {
              if (confirm('Are you sure you want to WIPE all workouts from this phone? This action is permanent.')) {
                onResetData();
                setStatus({ type: 'success', message: 'Offline database cleared successfully!' });
              }
            }}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 active:scale-98 transition-all text-xs text-rose-400 font-bold cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Wipe Offline Databases
          </button>
        </div>
      </div>
    </div>
  );
}
