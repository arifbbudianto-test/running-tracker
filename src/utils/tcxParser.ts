export interface Trackpoint {
  time: string;
  heartRate?: number;
  cadence?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  distance?: number; // cumulative distance
  speed?: number; // m/s
  pace?: number; // min/km
}

export interface ActivityLap {
  startTime: string;
  totalTimeSeconds: number;
  distanceMeters: number;
  calories: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  intensity?: string;
  triggerMethod?: string;
}

export interface ParsedActivity {
  id: string;
  sport: string;
  notes?: string;
  startTime: string;
  laps: ActivityLap[];
  trackpoints: Trackpoint[];
  summary: {
    totalDistanceKm: number;
    totalTimeSec: number;
    avgPaceMinKm: string;
    avgSpeedKmH: number;
    calories: number;
    avgHeartRate?: number;
    maxHeartRate?: number;
    avgCadence?: number;
    maxCadence?: number;
  };
}

export function parseTCX(tcxText: string): ParsedActivity {
  // Extract activity sport and ID
  const sportMatch = tcxText.match(/<Activity\s+Sport="([^"]+)"/i);
  const sport = sportMatch ? sportMatch[1] : 'Running';

  const idMatch = tcxText.match(/<Id>([^<]+)<\/Id>/i);
  const id = idMatch ? idMatch[1] : new Date().toISOString();

  const notesMatch = tcxText.match(/<Notes>([^<]+)<\/Notes>/i);
  const notes = notesMatch ? notesMatch[1] : undefined;

  // Find Laps
  const laps: ActivityLap[] = [];
  const lapRegex = /<Lap\s+StartTime="([^"]+)">([\s\S]*?)<\/Lap>/gi;
  let lapMatch;

  while ((lapMatch = lapRegex.exec(tcxText)) !== null) {
    const lapContent = lapMatch[2];
    const totalTimeSeconds = parseFloat(lapContent.match(/<TotalTimeSeconds>([0-9.]+)<\/TotalTimeSeconds>/i)?.[1] || '0');
    const distanceMeters = parseFloat(lapContent.match(/<DistanceMeters>([0-9.]+)<\/DistanceMeters>/i)?.[1] || '0');
    const calories = parseFloat(lapContent.match(/<Calories>([0-9.]+)<\/Calories>/i)?.[1] || '0');

    const avgHR = lapContent.match(/<AverageHeartRateBpm>\s*<Value>([0-9]+)<\/Value>/i)?.[1];
    const maxHR = lapContent.match(/<MaximumHeartRateBpm>\s*<Value>([0-9]+)<\/Value>/i)?.[1];

    laps.push({
      startTime: lapMatch[1],
      totalTimeSeconds,
      distanceMeters,
      calories,
      avgHeartRate: avgHR ? parseInt(avgHR) : undefined,
      maxHeartRate: maxHR ? parseInt(maxHR) : undefined,
      intensity: lapContent.match(/<Intensity>([^<]+)<\/Intensity>/i)?.[1],
      triggerMethod: lapContent.match(/<TriggerMethod>([^<]+)<\/TriggerMethod>/i)?.[1]
    });
  }

  // Parse Trackpoints
  const trackpoints: Trackpoint[] = [];
  const trackpointRegex = /<Trackpoint>([\s\S]*?)<\/Trackpoint>/gi;
  let tpMatch;

  let totalDistance = 0;
  if (laps.length > 0) {
    totalDistance = laps.reduce((sum, lap) => sum + lap.distanceMeters, 0);
  }

  while ((tpMatch = trackpointRegex.exec(tcxText)) !== null) {
    const tpContent = tpMatch[1];
    const timeMatch = tpContent.match(/<Time>([^<]+)<\/Time>/i);
    if (!timeMatch) continue;

    const time = timeMatch[1];
    const hrMatch = tpContent.match(/<HeartRateBpm>\s*<Value>([0-9]+)<\/Value>/i);
    const cadMatch = tpContent.match(/<Cadence>([0-9]+)<\/Cadence>/i);
    const latMatch = tpContent.match(/<LatitudeDegrees>([0-9.-]+)<\/LatitudeDegrees>/i);
    const lngMatch = tpContent.match(/<LongitudeDegrees>([0-9.-]+)<\/LongitudeDegrees>/i);
    const altMatch = tpContent.match(/<AltitudeMeters>([0-9.-]+)<\/AltitudeMeters>/i);
    const distMatch = tpContent.match(/<DistanceMeters>([0-9.-]+)<\/DistanceMeters>/i);

    const heartRate = hrMatch ? parseInt(hrMatch[1]) : undefined;
    const cadence = cadMatch ? parseInt(cadMatch[1]) : undefined;
    const latitude = latMatch ? parseFloat(latMatch[1]) : undefined;
    const longitude = lngMatch ? parseFloat(lngMatch[1]) : undefined;
    const altitude = altMatch ? parseFloat(altMatch[1]) : undefined;
    const distance = distMatch ? parseFloat(distMatch[1]) : undefined;

    trackpoints.push({
      time,
      heartRate,
      cadence,
      latitude,
      longitude,
      altitude,
      distance
    });
  }

  // If distance is missing from trackpoints, distribute lap distance evenly or interpolate
  if (trackpoints.length > 0) {
    const firstTime = new Date(trackpoints[0].time).getTime();
    const lastTime = new Date(trackpoints[trackpoints.length - 1].time).getTime();
    const totalDurationMs = lastTime - firstTime;

    let currentDistance = 0;
    trackpoints.forEach((tp, idx) => {
      if (tp.distance === undefined) {
        if (totalDurationMs > 0 && totalDistance > 0) {
          const pointTime = new Date(tp.time).getTime();
          const elapsedFraction = (pointTime - firstTime) / totalDurationMs;
          tp.distance = parseFloat((elapsedFraction * totalDistance).toFixed(1));
        } else {
          // Fallback if timestamps are invalid
          tp.distance = parseFloat(((idx / trackpoints.length) * totalDistance).toFixed(1));
        }
      }

      // Calculate speed and pace based on differences
      if (idx > 0) {
        const prevTp = trackpoints[idx - 1];
        const timeDiffSec = (new Date(tp.time).getTime() - new Date(prevTp.time).getTime()) / 1000;
        const distDiff = (tp.distance || 0) - (prevTp.distance || 0);
        
        if (timeDiffSec > 0 && distDiff >= 0) {
          tp.speed = parseFloat((distDiff / timeDiffSec).toFixed(2)); // m/s
          if (tp.speed > 0) {
            // Speed in km/h: speed * 3.6
            // Pace in min/km: 16.6667 / speed
            tp.pace = parseFloat((16.6667 / tp.speed).toFixed(2)); // minutes per km
          }
        }
      }
    });
  }

  // Calculate Summary metrics
  const totalDistanceKm = parseFloat((totalDistance / 1000).toFixed(2));
  const totalTimeSec = laps.reduce((sum, lap) => sum + lap.totalTimeSeconds, 0) || 
    (trackpoints.length > 1 
      ? (new Date(trackpoints[trackpoints.length - 1].time).getTime() - new Date(trackpoints[0].time).getTime()) / 1000 
      : 0);

  const calories = laps.reduce((sum, lap) => sum + lap.calories, 0);

  let avgHeartRate: number | undefined;
  let maxHeartRate: number | undefined;
  const validHRs = trackpoints.map(tp => tp.heartRate).filter((hr): hr is number => hr !== undefined && hr > 0);
  if (validHRs.length > 0) {
    avgHeartRate = Math.round(validHRs.reduce((sum, hr) => sum + hr, 0) / validHRs.length);
    maxHeartRate = Math.max(...validHRs);
  } else if (laps.length > 0) {
    const lapsWithHR = laps.filter(l => l.avgHeartRate !== undefined);
    if (lapsWithHR.length > 0) {
      avgHeartRate = Math.round(lapsWithHR.reduce((sum, l) => sum + (l.avgHeartRate || 0), 0) / lapsWithHR.length);
      maxHeartRate = Math.max(...laps.map(l => l.maxHeartRate || 0).filter(h => h > 0));
    }
  }

  let avgCadence: number | undefined;
  let maxCadence: number | undefined;
  const validCadences = trackpoints.map(tp => tp.cadence).filter((cad): cad is number => cadenceFilter(cad));
  if (validCadences.length > 0) {
    avgCadence = Math.round(validCadences.reduce((sum, c) => sum + c, 0) / validCadences.length);
    maxCadence = Math.max(...validCadences);
  }

  // Pace styling (e.g. 5:45 min/km)
  let avgPaceMinKm = '0:00';
  const avgSpeedKmH = totalTimeSec > 0 ? parseFloat(((totalDistanceKm / totalTimeSec) * 3600).toFixed(2)) : 0;
  if (avgSpeedKmH > 0) {
    const paceTotalMinutes = 60 / avgSpeedKmH;
    const paceMinutes = Math.floor(paceTotalMinutes);
    const paceSeconds = Math.round((paceTotalMinutes - paceMinutes) * 60);
    avgPaceMinKm = `${paceMinutes}:${paceSeconds < 10 ? '0' : ''}${paceSeconds}`;
  }

  return {
    id,
    sport,
    notes,
    startTime: laps[0]?.startTime || trackpoints[0]?.time || new Date().toISOString(),
    laps,
    trackpoints,
    summary: {
      totalDistanceKm,
      totalTimeSec,
      avgPaceMinKm,
      avgSpeedKmH,
      calories,
      avgHeartRate,
      maxHeartRate,
      avgCadence,
      maxCadence
    }
  };
}

function cadenceFilter(cad: number | undefined): cad is number {
  return cad !== undefined && cad > 0;
}

export interface KilometreSplit {
  splitNumber: number;
  timeSeconds: number;
  distanceMeters: number;
  pace: string;
  avgHeartRate?: number;
  avgCadence?: number;
}

export function calculateKmSplits(trackpoints: Trackpoint[]): KilometreSplit[] {
  if (trackpoints.length === 0) return [];
  
  const splits: KilometreSplit[] = [];
  let splitStartIdx = 0;
  let splitTarget = 1000; // meters
  
  for (let i = 0; i < trackpoints.length; i++) {
    const tp = trackpoints[i];
    const distance = tp.distance || 0;
    
    const isLastPoint = i === trackpoints.length - 1;
    if (distance >= splitTarget || isLastPoint) {
      const segmentPoints = trackpoints.slice(splitStartIdx, i + 1);
      if (segmentPoints.length > 1) {
        const startTime = new Date(segmentPoints[0].time).getTime();
        const endTime = new Date(segmentPoints[segmentPoints.length - 1].time).getTime();
        const durationSec = (endTime - startTime) / 1000;
        
        const startDist = segmentPoints[0].distance || 0;
        const endDist = segmentPoints[segmentPoints.length - 1].distance || 0;
        const distDiffMeters = endDist - startDist;
        const distDiffKm = distDiffMeters / 1000;
        
        if (durationSec > 0 && distDiffKm > 0) {
          const hrs = segmentPoints.map(p => p.heartRate).filter((hr): hr is number => hr !== undefined && hr > 0);
          const avgHR = hrs.length > 0 ? Math.round(hrs.reduce((sum, h) => sum + h, 0) / hrs.length) : undefined;
          
          const cads = segmentPoints.map(p => p.cadence).filter((c): c is number => c !== undefined && c > 0);
          let avgCad = cads.length > 0 ? Math.round(cads.reduce((sum, c) => sum + c, 0) / cads.length) : undefined;
          if (avgCad !== undefined && avgCad > 0 && avgCad < 120) {
            avgCad = avgCad * 2;
          }
          
          const paceTotalMin = (durationSec / 60) / distDiffKm;
          const paceMin = Math.floor(paceTotalMin);
          const paceSec = Math.round((paceTotalMin - paceMin) * 60);
          const paceStr = `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec}`;
          
          splits.push({
            splitNumber: splits.length + 1,
            timeSeconds: durationSec,
            distanceMeters: distDiffMeters,
            pace: paceStr,
            avgHeartRate: avgHR,
            avgCadence: avgCad
          });
        }
      }
      
      splitStartIdx = i;
      splitTarget += 1000;
    }
  }
  
  return splits;
}
