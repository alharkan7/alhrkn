'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Timeline from './components/Timeline';
import DetailDrawer from './components/DetailDrawer';
import Navigator from './components/Navigator';
import { PERIODS } from './constants';
import { HistoricalEvent, ViewState } from './types';
import * as d3 from 'd3';
import { AppsGrid } from '@/components/ui/apps-grid';
import { Button } from '@/components/ui/button';
import { LayoutGrid } from 'lucide-react';

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

        {/* Custom Full-Width Header */}
        <header className="sticky top-0 bg-background py-1 px-2 md:px-4 z-30">
          <div className="flex items-center justify-between min-h-[48px]">
            <div className="text-xl font-semibold">
              Nusantara Timeline
            </div>
            <AppsGrid
              trigger={
                <Button
                  variant="default"
                  className="flex items-center px-3 h-fit"
                >
                  <LayoutGrid size={14} /> Apps
                </Button>
              }
              useHardReload={false}
            />
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

          {/* Data Source Link */}
          <div className="absolute bottom-4 left-4 pointer-events-none opacity-50">
              <a href="https://docs.google.com/document/d/1NITH_ivLDyahZX8uWphV3sbH5vCrgnDBGvmqjxjqxQY/" target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-blue-600 hover:underline pointer-events-auto">
                Data Source
              </a>
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