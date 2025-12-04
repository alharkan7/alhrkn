export interface HistoricalEvent {
    title: string;
    description: string;
    year: number;
    date_display: string;
    illustrations: string;
    // Computed for layout
    periodColor?: string;
  }
  
  export interface HistoricalPeriod {
    period_title: string;
    start_year: number;
    end_year: number;
    description: string;
    illustrations: string;
    events: HistoricalEvent[];
    // Calculated fields for visual continuity and rendering
    visual_end_year: number; 
    color: string;
  }
  
  export interface ViewState {
    x: number;
    k: number;
  }
  