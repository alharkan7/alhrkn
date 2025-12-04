'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Timeline from './components/Timeline';
import DetailDrawer from './components/DetailDrawer';
import Navigator from './components/Navigator';
import { PERIODS } from './constants';
import { HistoricalEvent, ViewState } from './types';
import * as d3 from 'd3';

const IndonesiaHistoryPage: React.FC = () => {
  // selectedEvent controls the Drawer (Detailed Info)
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);
  // highlightedEvent controls the visual focus on Timeline and Navigator
  const [highlightedEvent, setHighlightedEvent] = useState<HistoricalEvent | null>(null);

  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [viewState, setViewState] = useState<ViewState | null>(null);

  // Flatten events for Navigator and Search
  const allEvents = useMemo(() => PERIODS.flatMap(p => p.events), []);

  // Resize handler
  useEffect(() => {
    const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleJumpToEvent = useCallback((event: HistoricalEvent) => {
    const timelineWidth = viewport.width;

    const minYear = d3.min(PERIODS, d => d.start_year) ?? -1600000;
    const maxYear = d3.max(PERIODS, d => d.visual_end_year) ?? 2024;
    const padding = Math.abs(maxYear - minYear) * 0.05;
    const domainStart = minYear;
    const domainEnd = maxYear + padding;

    // Center the event
    // Heuristic: Show a context window based on event age
    let viewWindow = 200; // Default 200 years context
    if (Math.abs(event.year) > 10000) viewWindow = 5000;
    if (Math.abs(event.year) > 100000) viewWindow = 50000;
    if (Math.abs(event.year) > 1000000) viewWindow = 500000;

    const domainWidth = domainEnd - domainStart;
    const k = domainWidth / viewWindow;

    const scaleRef = d3.scaleLinear().domain([domainStart, domainEnd]).range([0, timelineWidth]);
    const eventPixelPosUnzoomed = scaleRef(event.year);

    // Center it: ScreenCenter = eventX * k + x
    const x = (timelineWidth / 2) - (eventPixelPosUnzoomed * k);

    setViewState({ k, x });

    // Highlight the event without opening the drawer
    setHighlightedEvent(event);
  }, [viewport.width]);

  const handleTimelineEventClick = (event: HistoricalEvent) => {
      setSelectedEvent(event);
      setHighlightedEvent(event);
  };

  const handleTimelineViewChange = (k: number, x: number) => {
      // Optional: Update URL or state
  };

  const handleDeselect = () => {
    setHighlightedEvent(null);
    setSelectedEvent(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-900">

        {/* Header */}
        <header
          className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-30 shrink-0"
          onClick={handleDeselect} // Allow header click to reset too? Optional but keeps UI clean
        >
          <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold">ID</div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800">Nusantara <span className="font-light text-slate-500">Timeline</span></h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
             <a href="https://docs.google.com/document/d/1NITH_ivLDyahZX8uWphV3sbH5vCrgnDBGvmqjxjqxQY/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
               Data Source
             </a>
          </div>
        </header>

        {/* Main Timeline Area */}
        <main className="flex-1 relative">
          <Timeline
              width={viewport.width}
              height={viewport.height - 56 - 120} // Header 56, Footer 120
              periods={PERIODS}
              onEventClick={handleTimelineEventClick}
              onBackgroundClick={handleDeselect}
              highlightedEvent={highlightedEvent}
              viewState={viewState}
              onViewChange={handleTimelineViewChange}
          />

          {/* Helper Text Overlay */}
          <div className="absolute top-4 left-4 pointer-events-none opacity-50">
              <p className="text-xs font-mono text-slate-500">Scroll/Pinch to Zoom • Drag to Pan</p>
          </div>
        </main>

        {/* Bottom Navigator */}
        <footer className="h-[120px] shrink-0 z-30 bg-slate-900">
           <Navigator
              events={allEvents}
              onSelect={handleJumpToEvent}
              onBackgroundClick={handleDeselect}
              selectedYear={highlightedEvent?.year || null}
           />
        </footer>

        {/* Detail Drawer */}
        <DetailDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />

      </div>
    </div>
  );
};

export default IndonesiaHistoryPage;