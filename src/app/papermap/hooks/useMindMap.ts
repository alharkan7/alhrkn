'use client';

import { useEffect, useState, useMemo } from 'react';
import { LAYOUT_PRESETS, getDefaultLayoutIndex } from '../types';
import { EXAMPLE_PDF_URL } from '../data/sampleMindmap'; // For initial localStorage setting

import { useMindMapState } from './useMindMapState';
import { useMindMapRefs } from './useMindMapRefs';
import { useMindMapVisibility } from './useMindMapVisibility';
import { useMindMapNodeManagement } from './useMindMapNodeManagement';
import { useMindMapLayout } from './useMindMapLayout';
import { useMindMapDataProcessing } from './useMindMapDataProcessing';

export function useMindMap() {
  const {
    loading, setLoading,
    loadingStage, setLoadingStage,
    fileLoading, // Kept if Sidebar.tsx or other components use it
    uploadError, setUploadError,
    error, setError,
    mindMapData, setMindMapData,
    nodes, setNodes, onNodesChangeOriginal,
    edges, setEdges, onEdgesChange,
    pdfUrl, setPdfUrl,
    fileName, setFileName,
  } = useMindMapState();

  const {
    reactFlowWrapper,
    reactFlowInstance,
    addFollowUpNodeRef,
    deleteNodeRef,
    previousLayoutIndexRef,
    positionsToApplyRef,
  } = useMindMapRefs();

  // Layout Index State - managed here to pass currentLayout down
  const [currentLayoutIndex, setCurrentLayoutIndex] = useState<number>(() => getDefaultLayoutIndex());
  const currentLayout = useMemo(() => LAYOUT_PRESETS[currentLayoutIndex], [currentLayoutIndex]);
  const [layoutInitialized, setLayoutInitialized] = useState(false); // New state

  // Client-side effect for initial layout index (if getDefaultLayoutIndex depends on window)
  useEffect(() => {
    setCurrentLayoutIndex(getDefaultLayoutIndex());
    setLayoutInitialized(true); // Set layout as initialized
  }, []);

  const {
    collapsedNodes, setCollapsedNodes,
    toggleChildrenVisibility,
    // updateNodeVisibilityHook, // Visibility updates are now primarily handled by effects within useMindMapLayout and useMindMapVisibility
    // parentToChildrenMap, // If needed by other hooks, pass it through.
  } = useMindMapVisibility({
    mindMapData,
    setNodes,
    setEdges,
  });

  const {
    nodePositions, setNodePositions,
    updateNodeData,
    addFollowUpNode, // This is the actual function now, not a ref to it.
    deleteNode,      // This is the actual function now.
    onNodesChange,   // This is the custom handleNodesChange.
  } = useMindMapNodeManagement({
    nodes, setNodes, edges, setEdges, mindMapData, setMindMapData, onNodesChangeOriginal,
    reactFlowInstanceRef: reactFlowInstance, // Pass the ref itself
    addFollowUpNodeRef,
    deleteNodeRef,
    currentLayout, // Pass the derived layout object
    toggleChildrenVisibility,
    collapsedNodes,
    setCollapsedNodes,
  });

  const {
    handleResetView,
    cycleLayout,
  } = useMindMapLayout({
    mindMapData, nodes, setNodes, edges, setEdges,
    reactFlowInstanceRef: reactFlowInstance, // Pass the ref itself
    previousLayoutIndexRef,
    positionsToApplyRef,
    addFollowUpNodeRef,
    deleteNodeRef,
    updateNodeData,
    nodePositions,
    setNodePositions,
    toggleChildrenVisibility,
    collapsedNodes,
    currentLayoutIndex,
    setCurrentLayoutIndex,
    currentLayout, // Pass the derived layout object
    loading, // Pass loading state
    layoutInitialized, // Pass new state
  });

  const {
    loadExampleMindMap,
    handleFileUpload,
    handleTextInput,
    handleFileUploadStreaming,
    handleTextInputStreaming,
    // generateInitialMindMap, // Usually not called directly from UI
  } = useMindMapDataProcessing({
    setLoading, setLoadingStage, setError, setUploadError, setMindMapData,
    setPdfUrl, setFileName, setNodes, setEdges, setNodePositions, setCollapsedNodes,
    reactFlowInstanceRef: reactFlowInstance, // Pass the ref itself
  });

  // Effect to store example PDF URL in localStorage initially (moved from data processing hook)
  useEffect(() => {
    const existingBlobUrl = localStorage.getItem('pdfBlobUrl');
    const userHasUploaded = localStorage.getItem('userHasUploadedPdf') === 'true';
    if (!existingBlobUrl && !userHasUploaded) {
      localStorage.setItem('pdfBlobUrl', EXAMPLE_PDF_URL);
    }
  }, []);

  return {
    loading,
    loadingStage,
    error, // This is the error from useMindMapState, potentially general errors
    // uploadError, // If UI needs to distinguish upload errors specifically
    mindMapData,
    setMindMapData, // Expose this for hydration
    nodes,
    edges,
    nodePositions, // From useMindMapNodeManagement
    reactFlowWrapper, // From useMindMapRefs
    reactFlowInstance,  // From useMindMapRefs
    onNodesChange,    // Custom handler from useMindMapNodeManagement
    onEdgesChange,    // Original from useMindMapState/useEdgesState
    handleFileUpload, // From useMindMapDataProcessing
    handleTextInput,  // From useMindMapDataProcessing
    handleFileUploadStreaming, // Streaming version for Phase 2
    handleTextInputStreaming,  // Streaming version for Phase 2
    addFollowUpNode,  // Direct function from useMindMapNodeManagement
    deleteNode,       // Direct function from useMindMapNodeManagement
    handleResetView,  // From useMindMapLayout
    loadExampleMindMap,// From useMindMapDataProcessing
    pdfUrl,           // From useMindMapState
    fileName,         // From useMindMapState
    setFileName,      // <-- Expose setFileName here
    setLoading,       // <-- Expose setLoading here
    currentLayoutIndex, // From this hook's state
    cycleLayout,      // From useMindMapLayout
    // fileLoading, // Expose if needed by UI, from useMindMapState
    layoutInitialized, // Expose for MindMapFlow if needed, or for debugging
  };
}