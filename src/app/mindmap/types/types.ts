export interface NodeData {
    id: string;
    label: string;
    children?: NodeData[];
  }
  
  export interface ExtractedContent {
    title: string;
    keyPoints: {
      point: string;
      context?: string;
    }[];
  }