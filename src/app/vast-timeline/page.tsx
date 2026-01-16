'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Timeline from './components/Timeline';
import Navigator from './components/Navigator';
import JsonSidebar from './components/JsonSidebar';
import { PERIODS } from './constants';
import { HistoricalEvent, ViewState } from './types';
import * as d3 from 'd3';
import { AppsGrid } from '@/components/ui/apps-grid';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Menu, X, Upload } from 'lucide-react';
import historyDataJson from './history-data.json';

const IndonesiaHistoryPage: React.FC = () => {
  // highlightedEvent controls the visual focus on Timeline and Navigator (with popover)
  const [highlightedEvent, setHighlightedEvent] = useState<HistoricalEvent | null>(null);

  const [viewport, setViewport] = useState({ width: 1200, height: 800 }); // Default values for SSR
  const [viewState, setViewState] = useState<ViewState | null>(null);

  // Sidebar and JSON upload states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [jsonData, setJsonData] = useState(historyDataJson);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Flatten events for Navigator and Search
  const allEvents = useMemo(() => PERIODS.flatMap(p => p.events), []);

  // Validate JSON structure
  const validateJSON = (data: any): { valid: boolean; error?: string } => {
    try {
      if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid JSON: Must be an object' };
      }

      // Title is optional, but if provided must be a string
      if (data.title !== undefined && typeof data.title !== 'string') {
        return { valid: false, error: 'Invalid JSON: "title" must be a string' };
      }

      if (!data.rawData || !Array.isArray(data.rawData)) {
        return { valid: false, error: 'Invalid JSON: Missing or invalid "rawData" array' };
      }

      for (let i = 0; i < data.rawData.length; i++) {
        const period = data.rawData[i];

        if (!period.period_title || typeof period.period_title !== 'string') {
          return { valid: false, error: `Invalid JSON: Period ${i} missing "period_title"` };
        }

        if (typeof period.start_year !== 'number' || typeof period.end_year !== 'number') {
          return { valid: false, error: `Invalid JSON: Period "${period.period_title}" has invalid year values` };
        }

        if (!period.events || !Array.isArray(period.events)) {
          return { valid: false, error: `Invalid JSON: Period "${period.period_title}" missing "events" array` };
        }

        for (let j = 0; j < period.events.length; j++) {
          const event = period.events[j];

          if (!event.title || typeof event.title !== 'string') {
            return { valid: false, error: `Invalid JSON: Event ${j} in period "${period.period_title}" missing "title"` };
          }

          if (typeof event.year !== 'number') {
            return { valid: false, error: `Invalid JSON: Event "${event.title}" has invalid "year" value` };
          }
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  };

  // Handle JSON update (from file upload or direct edit)
  const handleJsonUpdate = (newData: any) => {
    const validation = validateJSON(newData);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid JSON format');
      return;
    }

    setJsonData(newData);
    setUploadError(null);
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        handleJsonUpdate(parsedData);
      } catch (error) {
        setUploadError('Failed to parse JSON file. Please check the file format.');
      }
    };

    reader.onerror = () => {
      setUploadError('Failed to read file');
    };

    reader.readAsText(file);

    // Reset the input
    event.target.value = '';
  };

  // Handle sidebar error
  const handleSidebarError = (error: string) => {
    setUploadError(error);
    setTimeout(() => setUploadError(null), 5000);
  };

  // Initialize viewport and set up resize handler
  useEffect(() => {
    // Set initial viewport size
    setViewport({ width: window.innerWidth, height: window.innerHeight });

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
    setHighlightedEvent(event);
  };

  const handleTimelineViewChange = (k: number, x: number) => {
    // Optional: Update URL or state
  };

  const handleDeselect = () => {
    setHighlightedEvent(null);
  };

  // Responsive height calculations
  const headerHeight = 64; // Approximate header height including padding
  const footerHeight = viewport.width < 640 ? 80 : viewport.width < 768 ? 100 : 120;
  const timelineHeight = viewport.height - headerHeight - footerHeight;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-900">

        {/* Custom Full-Width Header */}
        <header className="sticky top-0 bg-background py-2 px-3 sm:px-4 md:px-6 z-30 border-b border-border/20">
          <div className="flex items-center justify-between min-h-[48px] max-w-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex items-center gap-1.5 px-2 h-8 text-xs sm:text-sm shrink-0"
              >
                {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
              </Button>
              <div className="text-lg sm:text-xl font-semibold truncate">
                <span className="hidden sm:inline">{jsonData.title || 'Timeline'}</span>
                <span className="sm:hidden">{jsonData.title || 'Timeline'}</span>
              </div>
            </div>
            <AppsGrid
              trigger={
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-1.5 px-2 sm:px-3 h-8 text-xs sm:text-sm shrink-0"
                >
                  <LayoutGrid size={14} /> Apps
                </Button>
              }
              useHardReload={false}
            />
          </div>
        </header>

        {/* Sidebar for JSON Data */}
        <JsonSidebar
          isOpen={isSidebarOpen}
          jsonData={jsonData}
          onJsonUpdate={handleJsonUpdate}
          onError={handleSidebarError}
          footerHeight={footerHeight}
        />

        {/* Main Timeline Area */}
        <main className={`flex-1 relative overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-80 sm:ml-96' : 'ml-0'}`}>
          <Timeline
            width={isSidebarOpen ? viewport.width - (viewport.width < 640 ? 320 : 384) : viewport.width}
            height={Math.max(timelineHeight, 200)} // Ensure minimum height
            periods={PERIODS}
            onEventClick={handleTimelineEventClick}
            onBackgroundClick={handleDeselect}
            highlightedEvent={highlightedEvent}
            viewState={viewState}
            onViewChange={handleTimelineViewChange}
          />

          {/* Helper Text Overlay */}
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 pointer-events-none opacity-40 sm:opacity-50">
            <p className="text-[10px] sm:text-xs font-mono text-slate-500 leading-tight text-left">
              <span className="hidden sm:inline">Scroll/Pinch to Zoom • Drag to Pan</span>
              <span className="sm:hidden">Pinch/Scroll to Zoom<br />Drag to Pan</span>
            </p>
          </div>

          {/* Data Source Link */}
          <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 pointer-events-none opacity-40 sm:opacity-50">
            <a href="https://docs.google.com/document/d/1NITH_ivLDyahZX8uWphV3sbH5vCrgnDBGvmqjxjqxQY/" target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-xs font-mono text-blue-600 hover:underline pointer-events-auto">
              Data Source
            </a>
          </div>
        </main>

        {/* Bottom Navigator */}
        <footer className={`shrink-0 z-30 bg-slate-900`} style={{ height: footerHeight }}>
          <Navigator
            events={allEvents}
            onSelect={handleJumpToEvent}
            onBackgroundClick={handleDeselect}
            selectedYear={highlightedEvent?.year || null}
          />
        </footer>

      </div>
    </div>
  );
};

export default IndonesiaHistoryPage;