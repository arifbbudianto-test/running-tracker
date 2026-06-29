import { ParsedActivity, Trackpoint } from './tcxParser';

const STORAGE_KEY = 'velocity_activities_v1';

// Downsample trackpoints to a maximum number to optimize localStorage space
function downsampleTrackpoints(points: Trackpoint[], maxPoints = 300): Trackpoint[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const downsampled: Trackpoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const index = Math.min(Math.floor(i * step), points.length - 1);
    downsampled.push(points[index]);
  }
  return downsampled;
}

export function saveActivityToStorage(activity: ParsedActivity): ParsedActivity[] {
  if (typeof window === 'undefined') return [];

  // Downsample to protect localStorage size limits (~5MB)
  const optimizedActivity: ParsedActivity = {
    ...activity,
    trackpoints: downsampleTrackpoints(activity.trackpoints, 250),
  };

  const current = getActivitiesFromStorage();
  
  // Prevent duplicate uploads
  const filtered = current.filter(act => act.id !== optimizedActivity.id);
  const updated = [optimizedActivity, ...filtered];
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function getActivitiesFromStorage(): ParsedActivity[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse stored activities', e);
    return [];
  }
}

export function deleteActivityFromStorage(id: string): ParsedActivity[] {
  if (typeof window === 'undefined') return [];
  const current = getActivitiesFromStorage();
  const updated = current.filter(act => act.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearAllStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
