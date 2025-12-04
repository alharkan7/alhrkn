import { HistoricalPeriod } from './types';
import historyData from './history-data.json';

export const EVENT_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#84cc16', // lime-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#d946ef', // fuchsia-500
  '#f43f5e', // rose-500
  '#ec4899', // pink-500
];

const rawData = historyData.rawData;

// Process raw data into a continuous timeline
export const PERIODS: HistoricalPeriod[] = rawData.map((p, i, arr) => {
    // Visual end year should touch the start of the next period to avoid gaps.
    // If it's the last period, just use its own end year or a small buffer.
    const nextPeriodStart = arr[i + 1]?.start_year;
    
    // Continuity logic: extend current block to next block's start
    // unless the current block naturally ends after the next starts (overlap), 
    // in which case we might just let them overlap or clamp. 
    // Requirement: "blocks end always touch with the start of the next block"
    // We treat `visual_end_year` as the right-side boundary of the colored rect.
    let visualEnd = p.end_year;
    if (nextPeriodStart !== undefined) {
        visualEnd = Math.max(p.end_year, nextPeriodStart);
    }

    const color = EVENT_COLORS[i % EVENT_COLORS.length];

    return {
        ...p,
        visual_end_year: visualEnd,
        color: color,
        events: p.events.map(e => ({
            ...e,
            periodColor: color
        }))
    };
});
