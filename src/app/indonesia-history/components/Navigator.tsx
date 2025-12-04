import React from 'react';
import { HistoricalEvent } from '../types';

interface NavigatorProps {
  events: HistoricalEvent[];
  onSelect: (event: HistoricalEvent) => void;
  onBackgroundClick: () => void;
  selectedYear: number | null;
}

const Navigator: React.FC<NavigatorProps> = ({ events, onSelect, onBackgroundClick, selectedYear }) => {
  return (
    <div 
        className="h-full w-full bg-slate-900 border-t border-slate-700 flex flex-col"
        onClick={onBackgroundClick}
    >
      {/* <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 flex justify-between">
         <span>Event Navigator</span>
         <span>{events.length} Events</span>
      </div> */}
      
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
        <div className="flex items-center h-full px-4 space-x-1 min-w-max">
          {events.map((event, idx) => {
             const isSelected = selectedYear === event.year;
             return (
                <button
                  key={`${event.year}-${idx}`}
                  onClick={(e) => { e.stopPropagation(); onSelect(event); }}
                  className={`
                    group relative flex flex-col items-center justify-center h-3/4 min-w-[80px] max-w-[140px] px-2 rounded transition-all duration-200
                    ${isSelected ? 'bg-slate-700 ring-1 ring-white/20' : 'hover:bg-slate-800'}
                  `}
                >
                    {/* Color Marker */}
                    <div 
                        className={`w-full h-1.5 rounded-full mb-2 transition-all ${isSelected ? 'scale-100' : 'scale-75 opacity-70 group-hover:scale-95 group-hover:opacity-100'}`} 
                        style={{ backgroundColor: event.periodColor || '#ccc' }} 
                    />
                    
                    <span className={`text-[10px] font-mono mb-1 truncate w-full text-center ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                        {event.date_display}
                    </span>
                    <span className={`text-xs font-medium truncate w-full text-center ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                        {event.title}
                    </span>
                </button>
             )
          })}
        </div>
      </div>
    </div>
  );
};

export default Navigator;