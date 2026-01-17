'use client';

import { useState } from 'react';
import { useNodesState, useEdgesState, Node, Edge } from 'reactflow';
import { MindMapData } from '../types';
import { EXAMPLE_MINDMAP, EXAMPLE_PDF_URL } from '../data/sampleMindmap';

export function useMindMapState() {
  const [loading, setLoading] = useState(false);
  // Loading stages with user-friendly labels:
  // - 'uploading': Uploading your document...
  // - 'analyzing': AI is reading your content...
  // - 'generating': AI is creating your mindmap...
  // - 'saving': Saving your mindmap...
  // - 'building': Building your visualization...
  const [loadingStage, setLoadingStage] = useState<'uploading' | 'analyzing' | 'generating' | 'saving' | 'building' | null>(null);
  const [fileLoading, setFileLoading] = useState(false); // Kept as per original, assess if still needed by Sidebar
  const [uploadError, setUploadError] = useState<Error | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(EXAMPLE_MINDMAP);
  const [nodes, setNodes, onNodesChangeOriginal] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(EXAMPLE_PDF_URL);
  const [fileName, setFileName] = useState<string>('mindmap');

  return {
    loading, setLoading,
    loadingStage, setLoadingStage,
    fileLoading, setFileLoading,
    uploadError, setUploadError,
    error, setError,
    mindMapData, setMindMapData,
    nodes, setNodes, onNodesChangeOriginal,
    edges, setEdges, onEdgesChange,
    pdfUrl, setPdfUrl,
    fileName, setFileName,
  };
}
