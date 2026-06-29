'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Trackpoint } from '../utils/tcxParser';

export interface HRZoneSettings {
  age: number;
  maxHR: number;
  restingHR: number;
  method: 'max_hr' | 'karvonen';
}

interface RunningChartsProps {
  trackpoints: Trackpoint[];
  hrSettings: HRZoneSettings;
}

// Simple Moving Average (SMA) helper to smooth out data and prevent wiggling/jitter
function smoothSeries(
  data: Trackpoint[],
  key: 'heartRate' | 'cadence',
  windowSize: number = 9
): (number | null)[] {
  const result: (number | null)[] = [];
  const half = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(data.length - 1, i + half);
    let sum = 0;
    let count = 0;

    for (let j = start; j <= end; j++) {
      const val = data[j][key];
      if (val !== undefined && val > 0) {
        sum += val;
        count++;
      }
    }
    result.push(count > 0 ? Math.round(sum / count) : null);
  }
  return result;
}

export default function RunningCharts({ trackpoints, hrSettings }: RunningChartsProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'hr' | 'cadence'>('all');

  // Format trackpoints for Recharts and downsample if too large
  const chartData = useMemo(() => {
    if (trackpoints.length === 0) return [];

    // Smooth heartRate and cadence using a moving average
    const smoothedHR = smoothSeries(trackpoints, 'heartRate', 9);
    const smoothedCadence = smoothSeries(trackpoints, 'cadence', 9);

    // Format timestamps to relative time (mm:ss)
    const startTime = new Date(trackpoints[0].time).getTime();
    
    // Target around 80 points for clean, non-crowded rendering on mobile/desktop
    const samplingRate = Math.max(1, Math.floor(trackpoints.length / 80));
    
    const formatted = [];
    for (let i = 0; i < trackpoints.length; i += samplingRate) {
      const tp = trackpoints[i];
      const timeDiffSec = Math.round((new Date(tp.time).getTime() - startTime) / 1000);
      const mins = Math.floor(timeDiffSec / 60);
      const secs = timeDiffSec % 60;
      const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

      let hrVal = smoothedHR[i];
      let cadVal = smoothedCadence[i];

      // Standard running cadence (spm) is double the single-foot cadence (rpm)
      if (cadVal !== null && cadVal > 0 && cadVal < 120) {
        cadVal = cadVal * 2;
      }

      formatted.push({
        time: timeStr,
        rawTime: timeDiffSec,
        heartRate: hrVal,
        cadence: cadVal,
        distance: tp.distance ? parseFloat((tp.distance / 1000).toFixed(2)) : 0,
      });
    }

    return formatted;
  }, [trackpoints]);

  // Calculate HR Zones distribution based on method
  const hrZones = useMemo(() => {
    const hrMax = hrSettings.maxHR;
    const hrRest = hrSettings.restingHR;
    const isKarvonen = hrSettings.method === 'karvonen';

    const getThresholdBpm = (pct: number) => {
      if (isKarvonen) {
        return Math.round(hrRest + pct * (hrMax - hrRest));
      }
      return Math.round(pct * hrMax);
    };

    const z5Min = getThresholdBpm(0.90);
    const z4Min = getThresholdBpm(0.80);
    const z3Min = getThresholdBpm(0.70);
    const z2Min = getThresholdBpm(0.60);

    const zones = [
      { name: 'Z5 Anaerobic', minBpm: z5Min, color: 'bg-rose-500', textColor: 'text-rose-400', count: 0, desc: `>= ${z5Min} bpm` },
      { name: 'Z4 Threshold', minBpm: z4Min, color: 'bg-orange-500', textColor: 'text-orange-400', count: 0, desc: `${z4Min} - ${z5Min - 1} bpm` },
      { name: 'Z3 Tempo', minBpm: z3Min, color: 'bg-amber-500', textColor: 'text-amber-400', count: 0, desc: `${z3Min} - ${z4Min - 1} bpm` },
      { name: 'Z2 Aerobic', minBpm: z2Min, color: 'bg-emerald-500', textColor: 'text-emerald-400', count: 0, desc: `${z2Min} - ${z3Min - 1} bpm` },
      { name: 'Z1 Warm Up', minBpm: 0, color: 'bg-blue-500', textColor: 'text-blue-400', count: 0, desc: `< ${z2Min} bpm` },
    ];

    let totalPoints = 0;
    trackpoints.forEach((tp) => {
      if (tp.heartRate && tp.heartRate > 0) {
        totalPoints++;
        const hr = tp.heartRate;
        
        if (hr >= z5Min) {
          zones[0].count++;
        } else if (hr >= z4Min) {
          zones[1].count++;
        } else if (hr >= z3Min) {
          zones[2].count++;
        } else if (hr >= z2Min) {
          zones[3].count++;
        } else {
          zones[4].count++;
        }
      }
    });

    return zones.map((z) => ({
      ...z,
      percentage: totalPoints > 0 ? Math.round((z.count / totalPoints) * 100) : 0,
      durationMin: totalPoints > 0 ? Math.round((z.count * (trackpoints.length / totalPoints)) / 60) : 0,
    }));
  }, [trackpoints, hrSettings]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950/95 backdrop-blur-md p-4 rounded-xl border border-zinc-800 shadow-2xl">
          <p className="text-xs text-zinc-400 mb-2 font-medium">Time: {label}</p>
          {payload.map((item: any) => (
            <div key={item.name} className="flex items-center gap-2 mt-1">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-zinc-300 font-semibold">
                {item.name}: {item.value} {item.name === 'Heart Rate' ? 'Bpm' : 'Spm'}
              </span>
            </div>
          ))}
          {payload[0] && (
            <p className="text-xs text-zinc-500 mt-2 font-mono">
              Distance: {payload[0].payload.distance} km
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Interactive Charts Area */}
      <div className="lg:col-span-2 flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl relative overflow-hidden">
        {/* Decorative ambient blur */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 z-10">
          <div>
            <h3 className="text-lg font-bold text-zinc-100">Telemetry Over Time</h3>
            <p className="text-xs text-zinc-400">Analyze pace, cardiac performance, and running cadence</p>
          </div>

          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-850 self-start">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-zinc-800 text-cyan-400 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('hr')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'hr'
                  ? 'bg-zinc-800 text-rose-400 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Heart Rate
            </button>
            <button
              onClick={() => setActiveTab('cadence')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'cadence'
                  ? 'bg-zinc-800 text-emerald-400 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Cadence
            </button>
          </div>
        </div>

        <div className="h-[300px] w-full z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCadence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              
              {/* Left Y-axis (Heart Rate) */}
              {(activeTab === 'all' || activeTab === 'hr') && (
                <YAxis
                  yAxisId="left"
                  domain={['dataMin - 10', 'dataMax + 10']}
                  stroke="#f43f5e"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Heart Rate (bpm)', angle: -90, position: 'insideLeft', style: { fill: '#71717a', fontSize: '9px' }, offset: 10 }}
                />
              )}

              {/* Right Y-axis (Cadence) */}
              {(activeTab === 'all' || activeTab === 'cadence') && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={['dataMin - 10', 'dataMax + 10']}
                  stroke="#10b981"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Cadence (spm)', angle: 90, position: 'insideRight', style: { fill: '#71717a', fontSize: '9px' }, offset: 10 }}
                />
              )}

              <Tooltip content={customTooltip} />

              {(activeTab === 'all' || activeTab === 'hr') && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="heartRate"
                  name="Heart Rate"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHr)"
                />
              )}

              {(activeTab === 'all' || activeTab === 'cadence') && (
                <Area
                  yAxisId={activeTab === 'all' ? 'right' : 'left'} // use left axis if cadence only
                  type="monotone"
                  dataKey="cadence"
                  name="Cadence"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCadence)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heart Rate Zones Distribution Card */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="mb-6 relative z-10">
          <h3 className="text-lg font-bold text-zinc-100">Heart Rate Zones</h3>
          <p className="text-xs text-zinc-400">Intensity distribution based on your cardiac thresholds</p>
        </div>

        <div className="flex-grow space-y-4 relative z-10">
          {hrZones.map((zone) => (
            <div key={zone.name} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className={`${zone.textColor} flex items-center gap-1.5`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${zone.color}`} />
                  {zone.name}
                </span>
                <span className="text-zinc-300">
                  {zone.percentage}% <span className="text-zinc-500 font-normal">({zone.durationMin}m)</span>
                </span>
              </div>
              <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50">
                <div
                  className={`h-full ${zone.color} rounded-full transition-all duration-500`}
                  style={{ width: `${zone.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
          <p className="text-[10px] text-zinc-500 font-mono">
            Method: {hrSettings.method === 'karvonen' ? 'Karvonen (HR Reserve)' : 'Standard (% Max HR)'} | Max: {hrSettings.maxHR} bpm {hrSettings.method === 'karvonen' && `| Rest: ${hrSettings.restingHR} bpm`}
          </p>
        </div>
      </div>
    </div>
  );
}
