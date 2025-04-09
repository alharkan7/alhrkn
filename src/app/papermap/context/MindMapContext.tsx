'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Node, Edge, NodeChange, EdgeChange, ReactFlowInstance } from 'reactflow';
import { MindMapData } from '../types';

interface MindMapContextType {
  // State
  loading: boolean;
  loadingStage: 'uploading' | 'processing' | 'building' | null;
  error: string | null;
  mindMapData: MindMapData | null;
  nodes: Node[];
  edges: Edge[];
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
  reactFlowInstance: React.RefObject<ReactFlowInstance>;
  currentLayoutIndex: number;
  
  // Operations
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  handleFileUpload: (file: File, blobUrl?: string) => void;
  handleTextInput: (text: string) => Promise<boolean>;
  handleResetView: () => void;
  loadExampleMindMap: () => void;
  cycleLayout: () => void;
}

const MindMapContext = createContext<MindMapContextType | undefined>(undefined);

export function useMindMapContext() {
  const context = useContext(MindMapContext);
  if (context === undefined) {
    throw new Error('useMindMapContext must be used within a MindMapProvider');
  }
  return context;
}

interface MindMapProviderProps {
  children: ReactNode;
  value: MindMapContextType;
}

export function MindMapProvider({ children, value }: MindMapProviderProps) {
  return (
    <MindMapContext.Provider value={value}>
      {children}
    </MindMapContext.Provider>
  );
} 