import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { HistoricalPeriod, HistoricalEvent, ViewState } from '../types';
import { RotateCcw } from 'lucide-react';

interface TimelineProps {
  periods: HistoricalPeriod[];
  onEventClick: (event: HistoricalEvent) => void;
  onBackgroundClick: () => void;
  highlightedEvent: HistoricalEvent | null;
  width: number;
  height: number;
  viewState: ViewState | null; 
  onViewChange: (k: number, x: number) => void;
}

const TIME_UNITS = [
  { label: '1 Million Years', value: 1000000 },
  { label: '100 Millennia', value: 100000 },
  { label: '10 Millennia', value: 10000 },
  { label: '1 Millennium', value: 1000 },
  { label: '1 Century', value: 100 },
  { label: '1 Decade', value: 10 },
  { label: '1 Year', value: 1 },
  { label: '1 Month', value: 1 / 12 },
  { label: '1 Week', value: 7 / 365.25 },
];

const Timeline: React.FC<TimelineProps> = ({ 
  periods, 
  onEventClick, 
  onBackgroundClick,
  highlightedEvent,
  width, 
  height,
  viewState,
  onViewChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Flatten events for easier processing
  const allEvents = useMemo(() => periods.flatMap(p => p.events), [periods]);

  // Time range calculation
  const { minYear, maxYear } = useMemo(() => {
    const min = d3.min(periods, d => d.start_year) ?? -1600000;
    const max = d3.max(periods, d => d.visual_end_year) ?? 2024;
    const padding = Math.abs(max - min) * 0.05;
    return { minYear: min, maxYear: max + padding };
  }, [periods]);

  // Initial Scale
  const initialScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([0, width]);
  }, [minYear, maxYear, width]);

  const [currentScale, setCurrentScale] = useState(() => initialScale);
  const [transformState, setTransformState] = useState(d3.zoomIdentity);

  // Setup Zoom
  useEffect(() => {
    if (!svgRef.current) return;

    // Padding to ensure leftmost and rightmost labels are fully visible
    const PADDING_X = 150; 

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 100000000]) // Very deep zoom required for geological to modern times
      .translateExtent([[-PADDING_X, 0], [width + PADDING_X, height]])
      .on('zoom', (event) => {
        const transform = event.transform;
        setTransformState(transform);
        const newScale = transform.rescaleX(initialScale);
        setCurrentScale(() => newScale);
        onViewChange(transform.k, transform.x);
      });

    zoomBehaviorRef.current = zoom;
    d3.select(svgRef.current).call(zoom);
  }, [width, height, initialScale, onViewChange]);

  // Sync external view state changes
  useEffect(() => {
    if (viewState && svgRef.current && zoomBehaviorRef.current) {
        const currentTransform = d3.zoomTransform(svgRef.current);
        if (Math.abs(currentTransform.k - viewState.k) > 0.001 || Math.abs(currentTransform.x - viewState.x) > 1) {
             d3.select(svgRef.current)
               .transition()
               .duration(750)
               .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(viewState.x, 0).scale(viewState.k));
        }
    }
  }, [viewState]);

  // Handle Reset Zoom
  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (svgRef.current && zoomBehaviorRef.current) {
        d3.select(svgRef.current)
          .transition()
          .duration(750)
          .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  // Dynamic Scale Indicator Calculation
  const scaleIndicator = useMemo(() => {
    const domain = currentScale.domain();
    const range = currentScale.range();
    const rangeWidth = Math.abs(range[1] - range[0]);
    const domainWidth = Math.abs(domain[1] - domain[0]);
    
    if (domainWidth === 0 || rangeWidth === 0) return null;

    const pxPerYear = rangeWidth / domainWidth;

    // We aim for a bar width between 60px and 200px
    let bestUnit = TIME_UNITS.find(u => {
        const w = u.value * pxPerYear;
        return w >= 60 && w <= 200;
    });

    if (!bestUnit) {
        // Fallback: find closest to 100px
        let minDiff = Infinity;
        TIME_UNITS.forEach(u => {
            const w = u.value * pxPerYear;
            const diff = Math.abs(w - 100);
            if (diff < minDiff) {
                minDiff = diff;
                bestUnit = u;
            }
        });
    }

    if (!bestUnit) bestUnit = TIME_UNITS[0];
    
    return {
        label: bestUnit.label,
        width: bestUnit.value * pxPerYear
    };

  }, [currentScale, width]);

  // Layout Constants
  const EVENT_LABEL_WIDTH = 140; 
  const BAR_Y_START = height / 2 - 20;
  const BAR_HEIGHT = 40;
  const LINE_Y = height / 2;

  // --- Layout Calculation for Labels ---
  const visibleEventsWithLayout = useMemo(() => {
    const visibleEvents: { event: HistoricalEvent, x: number, lane: number, hiddenLabel: boolean }[] = [];
    const sorted = [...allEvents].sort((a, b) => a.year - b.year);
    const lanes = new Map<number, number>();

    // Limit the stack depth to prevent clutter
    // Sequence: 0 (closest), then alternating up/down. Limit to +/- 2 rows (5 total)
    const ALLOWED_LANES = [0, -1, 1, -2, 2];

    sorted.forEach(evt => {
        const x = currentScale(evt.year);
        // Skip if way off screen (considering the padding)
        if (x < -200 || x > width + 200) return;

        let assignedLane = 0;
        let placed = false;
        
        // Determine if this is the highlighted event - we force placement if so
        const isHighlighted = highlightedEvent && 
                              evt.title === highlightedEvent.title && 
                              evt.year === highlightedEvent.year;

        for (const lane of ALLOWED_LANES) {
            const lastEnd = lanes.get(lane) ?? -9999;
            if (x > lastEnd + 10) { 
                assignedLane = lane;
                lanes.set(lane, x + EVENT_LABEL_WIDTH);
                placed = true;
                break;
            }
        }

        // Force placement for highlighted event if it wasn't placed naturally
        if (isHighlighted && !placed) {
            assignedLane = 0; // Default to center lane
            placed = true;
        }

        visibleEvents.push({ 
            event: evt, 
            x, 
            lane: assignedLane,
            hiddenLabel: !placed 
        });
    });

    return visibleEvents;
  }, [allEvents, currentScale, width, transformState, highlightedEvent]);

  // Helper for coordinates
  const getLayoutCoords = (lane: number) => {
      const isTop = lane >= 0;
      const absLane = Math.abs(lane);
      const baseOffset = 30;
      const rowHeight = 45;

      let foY = 0;
      let lineY2 = 0;

      if (isTop) {
         // Box Top
         foY = LINE_Y - baseOffset - (absLane * rowHeight) - 10;
         lineY2 = foY + 40; 
      } else {
         // Box Top
         foY = LINE_Y + baseOffset + (absLane * rowHeight) - 20;
         lineY2 = foY + 10;
      }

      return { foY, lineY2, isTop };
  };

  // Helper to split text into two lines
  const splitPeriodTitle = (title: string): [string, string | null] => {
      const words = title.split(' ');
      if (words.length <= 1) return [title, null];
      
      const totalLen = title.length;
      let currentLen = 0;
      let breakIndex = 0;
      
      // Try to split roughly in half
      for(let i=0; i<words.length; i++) {
          currentLen += words[i].length + 1;
          if (currentLen >= totalLen / 2) {
              breakIndex = i + 1;
              break;
          }
      }
      
      // Safety clamp
      if (breakIndex >= words.length) breakIndex = words.length - 1;
      if (breakIndex < 1) breakIndex = 1;

      const line1 = words.slice(0, breakIndex).join(' ');
      const line2 = words.slice(breakIndex).join(' ');
      return [line1, line2];
  };

  return (
    <div className="relative overflow-hidden bg-slate-50 border-b border-slate-200 shadow-inner select-none" style={{ width, height }}>
      
      {/* Scale Indicator */}
      {scaleIndicator && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none opacity-80 z-20 transition-all duration-300">
          <div className="text-xs font-mono text-slate-500 mb-1 font-bold tracking-tight bg-slate-50/80 px-1 rounded">{scaleIndicator.label}</div>
          <div className="flex items-center" style={{ width: scaleIndicator.width }}>
              <div className="h-3 w-px bg-slate-600"></div>
              <div className="h-px bg-slate-600 flex-1"></div>
              <div className="h-3 w-px bg-slate-600"></div>
          </div>
        </div>
      )}

      {/* Reset Zoom Button */}
      <button 
        onClick={handleResetZoom}
        className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all z-20 group"
        title="Reset Zoom"
      >
        <RotateCcw className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" />
      </button>

      <svg 
        ref={svgRef} 
        width={width} 
        height={height} 
        className="cursor-grab active:cursor-grabbing"
        onClick={onBackgroundClick}
      >
        <defs>
            <clipPath id="chart-area">
              <rect x="-150" y="0" width={width + 300} height={height} />
            </clipPath>
        </defs>

        <g clipPath="url(#chart-area)">
          {/* 1. Draw Period Blocks (Background) */}
          {periods.map((period, i) => {
            const startX = currentScale(period.start_year);
            const endX = currentScale(period.visual_end_year);
            const w = Math.max(endX - startX, 0);
            
            // Optimization: Don't render if off screen
            if (startX > width + 200 || endX < -200) return null;

            // Visibility Logic for Labels
            const charWidth = 6.5; // Estimated width per char for font size 10
            const fullTextWidth = period.period_title.length * charWidth;
            const padding = 24;
            
            let showLabel = false;
            let lines: [string, string | null] = [period.period_title, null];

            if (w > fullTextWidth + padding) {
                // Fits in 1 line
                showLabel = true;
            } else if (w > (fullTextWidth / 2) + padding) {
                // Fits in 2 lines
                showLabel = true;
                lines = splitPeriodTitle(period.period_title);
            }

            return (
              <g key={period.period_title}>
                <rect
                  x={startX}
                  y={BAR_Y_START}
                  width={w}
                  height={BAR_HEIGHT}
                  fill={period.color}
                  opacity={0.9}
                  stroke="white"
                  strokeWidth={1}
                />
                {showLabel && (
                   <text
                     x={startX + w / 2}
                     y={BAR_Y_START + BAR_HEIGHT + 15}
                     fill={period.color}
                     fontWeight="bold"
                     fontSize="10"
                     textAnchor="middle"
                     opacity={0.8}
                     className="uppercase tracking-widest pointer-events-none"
                   >
                     <tspan x={startX + w / 2} dy="0">{lines[0]}</tspan>
                     {lines[1] && <tspan x={startX + w / 2} dy="1.2em">{lines[1]}</tspan>}
                   </text>
                )}
              </g>
            );
          })}

          {/* 2. Layer 1: Connector Lines (Behind everything) */}
          {visibleEventsWithLayout.map(({ event, x, lane, hiddenLabel }) => {
             if (hiddenLabel) return null;
             
             const { lineY2 } = getLayoutCoords(lane);
             return (
               <line 
                 key={`line-${event.year}-${event.title}`}
                 x1={x} y1={LINE_Y}
                 x2={x} y2={lineY2}
                 stroke={event.periodColor}
                 strokeWidth={1}
                 strokeDasharray="2,2"
                 className="opacity-50"
               />
             );
          })}

          {/* 3. Layer 2: Markers (Always visible, even if label is hidden) */}
           {visibleEventsWithLayout.map(({ event, x, hiddenLabel }) => {
             return (
               <circle 
                  key={`dot-${event.year}-${event.title}`}
                  cx={x} cy={LINE_Y} r={3} 
                  fill="white" stroke={event.periodColor} strokeWidth={2} 
                  className="cursor-pointer hover:scale-150 transition-transform"
                  onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
               />
             );
           })}

          {/* 4. Layer 3: Labels (On top of everything) - Only visible if placed */}
          {visibleEventsWithLayout.map(({ event, x, lane, hiddenLabel }) => {
             if (hiddenLabel) return null;

             const { foY } = getLayoutCoords(lane);
             const isHighlighted = highlightedEvent && 
                                   event.title === highlightedEvent.title && 
                                   event.year === highlightedEvent.year;

             return (
                 <foreignObject
                   key={`label-${event.year}-${event.title}`}
                   x={x - (EVENT_LABEL_WIDTH / 2)}
                   y={foY}
                   width={EVENT_LABEL_WIDTH}
                   height={50}
                   style={{ pointerEvents: 'none', overflow: 'visible' }}
                 >
                    <div className={`flex flex-col items-center justify-center w-full h-full p-1`}>
                       <div 
                          className={`
                            bg-white/90 backdrop-blur-[2px] border shadow-sm rounded px-2 py-1 max-w-full 
                            hover:bg-white hover:scale-105 transition-all duration-200 pointer-events-auto cursor-pointer
                            ${isHighlighted ? 'ring-2 ring-offset-2 scale-110 z-50 shadow-lg' : 'border-slate-200'}
                          `}
                          style={{ 
                              borderColor: isHighlighted ? event.periodColor : undefined,
                              ['--tw-ring-color' as any]: isHighlighted ? event.periodColor : undefined
                          }}
                          onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                       >
                          <div className="text-[9px] font-bold text-slate-700 leading-tight text-center line-clamp-2 w-full break-words whitespace-normal">
                             {event.title}
                          </div>
                          <div className="text-[8px] text-slate-500 text-center font-mono mt-0.5 truncate">
                             {event.date_display}
                          </div>
                       </div>
                    </div>
                 </foreignObject>
             )
          })}
        </g>
      </svg>
    </div>
  );
};

export default Timeline;