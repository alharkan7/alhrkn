import React from 'react';
import { HistoricalEvent } from '../types';
import { X, Calendar, BookOpen } from 'lucide-react';

interface DetailDrawerProps {
  event: HistoricalEvent | null;
  onClose: () => void;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({ event, onClose }) => {
  if (!event) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[450px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out h-full border-l border-slate-200">
        
        {/* Header */}
        <div 
          className="p-6 text-white flex justify-between items-start shrink-0 relative overflow-hidden"
          style={{ backgroundColor: event.periodColor || '#64748b' }}
        >
           {/* Decorative circles */}
           <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
           <div className="absolute top-10 -left-5 w-20 h-20 bg-white/10 rounded-full" />

           <div className="relative z-10 w-full">
            <h2 className="text-2xl font-bold leading-tight mb-2 pr-8">{event.title}</h2>
            <div className="flex items-center text-white/90 font-medium text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{event.date_display}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="relative z-10 p-2 hover:bg-white/20 rounded-full transition-colors -mr-2 -mt-2"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* Image Placeholder */}
          <div className="w-full aspect-video bg-slate-100 rounded-lg mb-6 border border-slate-200 flex items-center justify-center overflow-hidden relative group">
             <img 
               src={`https://picsum.photos/seed/${event.year}/800/600`} 
               alt={event.title}
               className="w-full h-full object-cover"
             />
             <div className="absolute bottom-0 inset-x-0 bg-black/50 p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
               Illustration Placeholder
             </div>
          </div>
          {event.illustrations && (
             <div className="mb-4 text-xs text-slate-400 italic">
               Note: {event.illustrations}
             </div>
          )}

          <div className="prose prose-slate max-w-none">
            <div className="flex items-center gap-2 mb-3">
               <BookOpen className="w-5 h-5 text-slate-400" />
               <h3 className="text-lg font-semibold text-slate-800 m-0">Historical Context</h3>
            </div>
            <p className="text-slate-600 leading-relaxed text-lg">
              {event.description}
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100">
             <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Metadata</h4>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded border border-slate-100">
                  <span className="block text-xs text-slate-400">Timeline Year</span>
                  <span className="font-mono text-sm font-medium text-slate-700">{event.year}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DetailDrawer;
