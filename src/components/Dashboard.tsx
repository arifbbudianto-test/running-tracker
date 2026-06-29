'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Activity, 
  Flame, 
  Clock, 
  TrendingUp, 
  Heart, 
  Footprints, 
  Calendar, 
  UploadCloud, 
  Award,
  Navigation,
  Smartphone,
  Info
} from 'lucide-react';
import { parseTCX, ParsedActivity } from '../utils/tcxParser';
import { 
  getActivitiesFromStorage, 
  saveActivityToStorage, 
  deleteActivityFromStorage, 
  clearAllStorage 
} from '../utils/storage';
import RunningCharts from './RunningCharts';
import HistoryTab from './HistoryTab';
import TrendsTab from './TrendsTab';
import ImportTab from './ImportTab';

// Dynamically import map component to avoid SSR (Leaflet requires window)
const RunningMap = dynamic(() => import('./RunningMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] w-full rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-cyan-400"></div>
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Loading Map...</span>
      </div>
    </div>
  ),
});

interface DashboardProps {
  initialActivity: ParsedActivity;
}

type TabType = 'dashboard' | 'history' | 'trends' | 'import';

export default function Dashboard({ initialActivity }: DashboardProps) {
  const [activities, setActivities] = useState<ParsedActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ParsedActivity | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Load activities from local storage on mount and register Service Worker
  useEffect(() => {
    let stored = getActivitiesFromStorage();
    if (stored.length === 0) {
      // Seed with initial activity if empty
      stored = saveActivityToStorage(initialActivity);
    }
    setActivities(stored);
    setSelectedActivity(stored[0] || initialActivity);

    // Register PWA service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('Service Worker registered:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));
    }
  }, [initialActivity]);

  // Handle new TCX upload
  const handleImportSuccess = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseTCX(text);
      
      const updated = saveActivityToStorage(parsed);
      setActivities(updated);
      setSelectedActivity(parsed);
      
      // Auto switch back to dashboard to view the run
      setActiveTab('dashboard');
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || 'File parsing failed.');
    }
  };

  // Delete activity
  const handleDeleteActivity = (id: string) => {
    const updated = deleteActivityFromStorage(id);
    setActivities(updated);
    
    // Adjust selected activity if needed
    if (selectedActivity?.id === id) {
      setSelectedActivity(updated[0] || null);
    }
  };

  // Clear all data
  const handleResetData = () => {
    clearAllStorage();
    setActivities([]);
    setSelectedActivity(null);
  };

  // Load default sample
  const handleLoadSample = () => {
    const seeded = saveActivityToStorage(initialActivity);
    setActivities(seeded);
    setSelectedActivity(seeded[0] || initialActivity);
    setActiveTab('dashboard');
  };

  // Select activity from history
  const handleSelectActivity = (act: ParsedActivity) => {
    setSelectedActivity(act);
    setActiveTab('dashboard');
  };

  // Date formatting
  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Duration formatting
  const formatDuration = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.round(totalSeconds % 60);
    return `${hrs > 0 ? hrs + ':' : ''}${hrs > 0 && mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 flex flex-col font-sans w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative border-x border-zinc-900 md:border-x-0 shadow-2xl md:shadow-none">
      {/* App Header (Responsive Header) */}
      <header className="sticky top-0 z-50 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-400 animate-pulse" />
          <div>
            <h1 className="text-sm font-black tracking-wider bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent uppercase">
              VELOCITY
            </h1>
            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block -mt-1">
              Biometric Running Dashboard
            </span>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-zinc-950/80 border border-zinc-850 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'trends'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            Trends
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            Import
          </button>
        </div>
        
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
          <Smartphone className="h-3 w-3 text-cyan-400" />
          <span className="text-[9px] font-mono text-zinc-400">Offline PWA</span>
        </div>
      </header>

      {/* Main Container with offset for fixed bottom nav */}
      <main className="flex-grow p-4 pb-24 md:pb-12 overflow-y-auto">
        
        {/* Render Tab Contents */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Active Run Header */}
            {selectedActivity ? (
              <>
                <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest ${
                      selectedActivity.notes === 'Treadmill'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    }`}>
                      {selectedActivity.notes || selectedActivity.sport}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-semibold font-mono">
                      {formatDateStr(selectedActivity.startTime)}
                    </span>
                  </div>
                  <h2 className="text-base font-black text-zinc-50">
                    {selectedActivity.notes === 'Treadmill' ? '🏃‍♂️ Treadmill Training Session' : '🏃‍♂️ Outdoor Run Session'}
                  </h2>
                </div>

                {/* Highlight Cards Grid - Responsive columns */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  
                  {/* Card: Distance */}
                  <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 hover:border-cyan-500/30 transition-all flex flex-col justify-between h-24">
                    <div className="flex justify-between items-center text-zinc-500">
                      <span className="text-[8px] font-bold uppercase tracking-widest">Distance</span>
                      <Navigation className="h-3.5 w-3.5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-zinc-200">
                        {selectedActivity.summary.totalDistanceKm} <span className="text-[10px] text-zinc-500 font-medium">km</span>
                      </h3>
                    </div>
                  </div>

                  {/* Card: Duration */}
                  <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 hover:border-purple-500/30 transition-all flex flex-col justify-between h-24">
                    <div className="flex justify-between items-center text-zinc-500">
                      <span className="text-[8px] font-bold uppercase tracking-widest">Duration</span>
                      <Clock className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-zinc-200">
                        {formatDuration(selectedActivity.summary.totalTimeSec)}
                      </h3>
                    </div>
                  </div>

                  {/* Card: Avg Pace */}
                  <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 hover:border-amber-500/30 transition-all flex flex-col justify-between h-24">
                    <div className="flex justify-between items-center text-zinc-500">
                      <span className="text-[8px] font-bold uppercase tracking-widest">Avg Pace</span>
                      <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-zinc-200">
                        {selectedActivity.summary.avgPaceMinKm} <span className="text-[10px] text-zinc-500 font-medium">/km</span>
                      </h3>
                    </div>
                  </div>

                  {/* Card: Calories */}
                  <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 hover:border-orange-500/30 transition-all flex flex-col justify-between h-24">
                    <div className="flex justify-between items-center text-zinc-500">
                      <span className="text-[8px] font-bold uppercase tracking-widest">Calories</span>
                      <Flame className="h-3.5 w-3.5 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-zinc-200">
                        {selectedActivity.summary.calories} <span className="text-[10px] text-zinc-500 font-medium">kcal</span>
                      </h3>
                    </div>
                  </div>

                  {/* Card: Avg Heart Rate */}
                  <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 hover:border-rose-500/30 transition-all flex flex-col justify-between h-24">
                    <div className="flex justify-between items-center text-zinc-500">
                      <span className="text-[8px] font-bold uppercase tracking-widest">Heart Rate</span>
                      <Heart className="h-3.5 w-3.5 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-zinc-200">
                        {selectedActivity.summary.avgHeartRate || '--'}
                        <span className="text-[10px] text-zinc-500 font-normal"> / {selectedActivity.summary.maxHeartRate || '--'} bpm</span>
                      </h3>
                    </div>
                  </div>

                  {/* Card: Avg Cadence */}
                  <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 hover:border-emerald-500/30 transition-all flex flex-col justify-between h-24">
                    <div className="flex justify-between items-center text-zinc-500">
                      <span className="text-[8px] font-bold uppercase tracking-widest">Cadence</span>
                      <Footprints className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-zinc-200">
                        {selectedActivity.summary.avgCadence || '--'}
                        <span className="text-[10px] text-zinc-500 font-normal"> / {selectedActivity.summary.maxCadence || '--'} spm</span>
                      </h3>
                    </div>
                  </div>

                </div>

                {/* Map & Charts Grid - Stacked on mobile, side-by-side on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GPS Map */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider px-1">Geospatial Route Map</h3>
                    <RunningMap trackpoints={selectedActivity.trackpoints} sport={selectedActivity.sport} />
                  </div>

                  {/* Telemetry Charts */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider px-1">Sensors Telemetry Curves</h3>
                    <RunningCharts trackpoints={selectedActivity.trackpoints} maxHR={selectedActivity.summary.maxHeartRate} />
                  </div>
                </div>

                {/* Laps List */}
                {selectedActivity.laps.length > 0 && (
                  <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-2xl space-y-3">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Lap Splits</h3>
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {selectedActivity.laps.map((lap, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-zinc-950/60 border border-zinc-900 p-2.5 rounded-xl text-xs font-semibold">
                          <span className="text-zinc-500 font-extrabold">Lap #{idx + 1}</span>
                          <span className="text-zinc-200 font-mono">{formatDuration(lap.totalTimeSeconds)}</span>
                          <span className="text-zinc-200 font-mono">{lap.distanceMeters} m</span>
                          <span className="text-rose-400 font-mono flex items-center gap-0.5">
                            <Heart className="h-3 w-3 shrink-0" />
                            {lap.avgHeartRate || '--'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
                <Info className="h-8 w-8 text-zinc-500 mb-2" />
                <h3 className="text-sm font-bold text-zinc-400">Seeding Database...</h3>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryTab
            activities={activities}
            selectedId={selectedActivity?.id}
            onSelect={handleSelectActivity}
            onDelete={handleDeleteActivity}
          />
        )}

        {activeTab === 'trends' && (
          <TrendsTab activities={activities} />
        )}

        {activeTab === 'import' && (
          <ImportTab
            onImportSuccess={handleImportSuccess}
            onResetData={handleResetData}
            onLoadSample={handleLoadSample}
          />
        )}

      </main>

      {/* Bottom Sticky Tab Bar (Premium Mobile Glassmorphic Navbar) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-zinc-950/90 backdrop-blur-md border-t border-zinc-900/80 px-2 py-2.5 flex justify-around items-center z-50">
        
        {/* Tab 1: Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'text-cyan-400 scale-105' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Activity className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Dashboard</span>
        </button>

        {/* Tab 2: History */}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'history' ? 'text-cyan-400 scale-105' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">History</span>
        </button>

        {/* Tab 3: Trends */}
        <button
          onClick={() => setActiveTab('trends')}
          className={`flex flex-col items-center gap-1.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'trends' ? 'text-cyan-400 scale-105' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <TrendingUp className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Trends</span>
        </button>

        {/* Tab 4: Import */}
        <button
          onClick={() => setActiveTab('import')}
          className={`flex flex-col items-center gap-1.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'import' ? 'text-cyan-400 scale-105' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <UploadCloud className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Import</span>
        </button>

      </nav>
    </div>
  );
}
