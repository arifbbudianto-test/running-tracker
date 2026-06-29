'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ParsedActivity } from '../utils/tcxParser';
import { TrendingUp, Footprints, Award, Heart, Flame, Navigation, Clock } from 'lucide-react';

interface TrendsTabProps {
  activities: ParsedActivity[];
}

export default function TrendsTab({ activities }: TrendsTabProps) {
  // Sort activities chronologically for trends
  const chronoActivities = useMemo(() => {
    return [...activities].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [activities]);

  // Overall sums
  const stats = useMemo(() => {
    const totalRuns = activities.length;
    const totalDistance = parseFloat(activities.reduce((sum, act) => sum + act.summary.totalDistanceKm, 0).toFixed(1));
    const totalSec = activities.reduce((sum, act) => sum + act.summary.totalTimeSec, 0);
    const totalCalories = activities.reduce((sum, act) => sum + act.summary.calories, 0);

    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const durationStr = `${hrs}h ${mins}m`;

    return { totalRuns, totalDistance, durationStr, totalCalories };
  }, [activities]);

  // Convert pace string 'MM:SS' to decimal minutes
  const paceToDecimal = (paceStr: string): number => {
    const parts = paceStr.split(':');
    if (parts.length !== 2) return 0;
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    return mins + secs / 60;
  };

  // Convert decimal minutes back to 'MM:SS'
  const decimalToPace = (val: number): string => {
    const mins = Math.floor(val);
    const secs = Math.round((val - mins) * 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Data for charts
  const trendData = useMemo(() => {
    return chronoActivities.map((act) => {
      const date = new Date(act.startTime);
      const label = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
      
      return {
        label,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        distance: act.summary.totalDistanceKm,
        paceDecimal: paceToDecimal(act.summary.avgPaceMinKm),
        paceStr: act.summary.avgPaceMinKm,
        avgHR: act.summary.avgHeartRate || null,
        maxHR: act.summary.maxHeartRate || null,
        calories: act.summary.calories,
        type: act.notes || act.sport,
      };
    });
  }, [chronoActivities]);

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <div className="h-16 w-16 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-600 mb-4">
          <TrendingUp className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-zinc-300">No Data Available</h3>
        <p className="text-xs text-zinc-500 max-w-xs mt-1">
          Trend charts require at least one activity to be uploaded. Go to the Import tab to load a TCX file.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div>
        <h3 className="text-base font-bold text-zinc-200">Aggregate Analytics</h3>
        <p className="text-[11px] text-zinc-500">Your total training volume and fitness trends</p>
      </div>

      {/* Aggregate Stats Cards (Grid 2x2 on Mobile) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Total Runs</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h4 className="text-xl font-black text-zinc-200">{stats.totalRuns}</h4>
            <span className="text-[9px] text-zinc-500 font-medium">Workouts persisted</span>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Total Dist</span>
            <Navigation className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-xl font-black text-zinc-200">{stats.totalDistance} <span className="text-[10px] text-zinc-500 font-normal">km</span></h4>
            <span className="text-[9px] text-zinc-500 font-medium">Accumulated volume</span>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Total Time</span>
            <Clock className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h4 className="text-xl font-black text-zinc-200">{stats.durationStr}</h4>
            <span className="text-[9px] text-zinc-500 font-medium">Time spent training</span>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Calories</span>
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <h4 className="text-xl font-black text-zinc-200">{stats.totalCalories.toLocaleString()} <span className="text-[10px] text-zinc-500 font-normal">kcal</span></h4>
            <span className="text-[9px] text-zinc-500 font-medium">Total energy expenditure</span>
          </div>
        </div>
      </div>

      {/* Chart 1: Distance volume trend */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
        <h4 className="text-xs font-bold text-zinc-300 mb-4 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          Distance Run (km) per Activity
        </h4>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
              <XAxis dataKey="label" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-[11px] shadow-xl">
                        <p className="font-bold text-zinc-300">{data.date} ({data.type})</p>
                        <p className="text-cyan-400 font-semibold mt-1">Distance: {data.distance} km</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="distance" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Pace progression (lower is better!) */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
        <h4 className="text-xs font-bold text-zinc-300 mb-4 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Pace Trend (min/km)
        </h4>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
              <XAxis dataKey="label" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#52525b"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                reversed // Lower pace is faster, which is better!
                domain={['dataMin - 1', 'dataMax + 1']}
                tickFormatter={(tick) => decimalToPace(tick)}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-[11px] shadow-xl">
                        <p className="font-bold text-zinc-300">{data.date}</p>
                        <p className="text-amber-400 font-semibold mt-1">Avg Pace: {data.paceStr} /km</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="paceDecimal"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ fill: '#f59e0b', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Heart Rate Trend */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
        <h4 className="text-xs font-bold text-zinc-300 mb-4 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          Cardiac Performance Trend
        </h4>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
              <XAxis dataKey="label" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-[11px] shadow-xl">
                        <p className="font-bold text-zinc-300">{data.date}</p>
                        <p className="text-rose-400 font-semibold mt-1">Avg HR: {data.avgHR} bpm</p>
                        <p className="text-rose-500 font-semibold">Max HR: {data.maxHR} bpm</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="avgHR"
                name="Average HR"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ fill: '#f43f5e', r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="maxHR"
                name="Max HR"
                stroke="#e11d48"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={{ fill: '#e11d48', r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
