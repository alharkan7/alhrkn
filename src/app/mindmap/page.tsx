"use client";

import { useState } from "react";
import { NodeData } from './types/types'
import MindMap from './components/MindMap'
import PDFExtractor from './components/PDFExtractor'
import type { PDFExtract } from "./lib/schemas"

export default function PDFAnalyzer() {
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null)
  const [mindMapData, setMindMapData] = useState<NodeData>({
    id: 'root',
    label: '',
    children: []
  })

  const handleExtractComplete = (extractedContent: PDFExtract) => {
    // Convert extracted content to mind map data
    const rootNode: NodeData = {
      id: 'root',
      label: extractedContent.title || 'Untitled Document',
      children: []
    }

    const contextGroups: { [key: string]: NodeData } = {}
    
    if (!extractedContent.keyPoints) return rootNode
    extractedContent.keyPoints.forEach((item, index) => {
      if (!item) return
      
      const context = item.context || 'General'
      if (!contextGroups[context]) {
        contextGroups[context] = {
          id: `context-${context}`,
          label: context,
          children: []
        }
        rootNode.children?.push(contextGroups[context])
      }
      
      contextGroups[context].children?.push({
        id: `point-${index}`,
        label: item.point || 'No content'
      })
    })

    setMindMapData(rootNode)
  }

  const handlePartialContent = (content: Partial<PDFExtract>) => {
    if (content.title || content.keyPoints?.length) {
      const rootNode: NodeData = {
        id: 'root',
        label: content.title || 'Loading...',
        children: []
      }

      const contextGroups: { [key: string]: NodeData } = {}
      
      content.keyPoints?.forEach((item, index) => {
        if (!item) return
        
        const context = item.context || 'General'
        if (!contextGroups[context]) {
          contextGroups[context] = {
            id: `context-${context}`,
            label: context,
            children: []
          }
          rootNode.children?.push(contextGroups[context])
        }
        
        contextGroups[context].children?.push({
          id: `point-${index}`,
          label: item.point || 'Loading...'
        })
      })

      setMindMapData(rootNode)
    }
  }

  return (
    <div className="max-h-[100dvh] w-full flex gap-4 p-4 bg-zinc-100">
      {/* PDF Extractor - Fixed width, pinned to left */}
      <div className="w-[400px] flex-shrink-0 border border-zinc-200 rounded-xl shadow-sm">
        <PDFExtractor 
          onExtractComplete={handleExtractComplete}
          onPartialContent={handlePartialContent}
        />
      </div>

      {/* Mind Map - Takes remaining space */}
      <div className="flex-grow h-[calc(100vh-2rem)] border border-zinc-200 bg-white overflow-hidden rounded-xl shadow-sm">
        <MindMap 
          data={mindMapData} 
          onNodeClick={(node) => setSelectedNode(node)}
        />
      </div>
    </div>
  )
}
