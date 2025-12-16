'use client';

import React, { useCallback, useState } from 'react';
import { useReactFlow } from 'reactflow';
import { Trash2, Copy, Plus, X, FolderTree, Layout, Eraser, ArrowDown, Palette, ChevronRight } from 'lucide-react';

interface Props {
  id: string | null;
  top: number;
  left: number;
  type: 'node' | 'pane' | 'edge';
  hasChildren?: boolean;
  onClose: () => void;
  onAddNode: (x: number, y: number) => void;
  onAddChild?: () => void;
  onToggleBranch?: () => void;
  onAutoLayout: () => void;
  onClearCanvas: () => void;
  onColorChange?: (color: string) => void;
}

const COLORS = [
  { name: 'Default', value: 'default', bg: 'bg-white' },
  { name: 'Red', value: 'red', bg: 'bg-red-500' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500' },
  { name: 'Amber', value: 'amber', bg: 'bg-amber-500' },
  { name: 'Green', value: 'green', bg: 'bg-green-500' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-500' },
];

export default function ContextMenu({ id, top, left, type, hasChildren, onClose, onAddNode, onAddChild, onToggleBranch, onAutoLayout, onClearCanvas, onColorChange }: Props) {
  const { setNodes, setEdges } = useReactFlow();
  const [showColorMenu, setShowColorMenu] = useState(false);

  const deleteNode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
    setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
    onClose();
  }, [id, setNodes, setEdges, onClose]);

  const deleteEdge = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
    onClose();
  }, [id, setEdges, onClose]);

  const duplicateNode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    setNodes((nodes) => {
      const node = nodes.find((n) => n.id === id);
      if (!node) return nodes;
      
      const position = {
        x: node.position.x + 50,
        y: node.position.y + 50,
      };

      return [
        ...nodes,
        {
          ...node,
          id: `${node.id}-copy-${Date.now()}`,
          position,
          selected: true,
          data: { ...node.data } // Ensure data is copied (including color)
        },
      ];
    });
    onClose();
  }, [id, setNodes, onClose]);

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddChild) onAddChild();
    onClose();
  };

  const handleToggleBranch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleBranch) onToggleBranch();
    onClose();
  }

  const handleAddNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddNode(0,0); 
    onClose();
  };

  const handleAutoLayout = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAutoLayout();
    onClose();
  };

  const handleClearCanvas = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Directly clear without confirmation to avoid blocking issues
    onClearCanvas();
    onClose();
  }
  
  const handleColorClick = (e: React.MouseEvent, color: string) => {
    e.stopPropagation();
    if (onColorChange) onColorChange(color);
    onClose();
  }

  const menuClass = "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left w-full";
  const itemClass = `${menuClass} text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700`;
  const deleteClass = `${menuClass} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-t border-slate-100 dark:border-slate-700`;

  return (
    <div
      style={{ top, left }}
      className="absolute z-50 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5"
      onClick={(e) => e.stopPropagation()}
    >
      {type === 'node' && (
        <div className="flex flex-col py-1">
          <button onClick={handleAddChild} className={itemClass}>
            <ArrowDown size={16} className="text-slate-400 dark:text-slate-500" />
            Add a Child
          </button>

          <button onClick={duplicateNode} className={itemClass}>
            <Copy size={16} className="text-slate-400 dark:text-slate-500" />
            Duplicate
          </button>
          
          {/* Color Menu */}
          <div className="relative">
            <button 
              className={`${itemClass} justify-between ${showColorMenu ? 'bg-slate-50 dark:bg-slate-700' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowColorMenu(!showColorMenu);
              }}
            >
              <div className="flex items-center gap-3">
                <Palette size={16} className="text-slate-400 dark:text-slate-500" />
                Color
              </div>
              <ChevronRight 
                size={14} 
                className={`text-slate-400 transition-transform duration-200 ${showColorMenu ? 'rotate-90' : ''}`} 
              />
            </button>
            
            {showColorMenu && (
              <div className="absolute left-full top-0 ml-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden py-1">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={(e) => handleColorClick(e, color.value)}
                    className="flex items-center gap-3 px-4 py-2 text-sm w-full hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <div className={`w-3 h-3 rounded-full ${color.bg === 'bg-white' ? 'bg-slate-200 border border-slate-300' : color.bg}`} />
                    <span className="text-slate-700 dark:text-slate-200">{color.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {onToggleBranch && hasChildren && (
            <button onClick={handleToggleBranch} className={itemClass}>
              <FolderTree size={16} className="text-slate-400 dark:text-slate-500" />
              Toggle Branch
            </button>
          )}

          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

          <button onClick={deleteNode} className={`${itemClass} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}>
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      )}

      {type === 'edge' && (
        <div className="flex flex-col py-1">
          <button onClick={deleteEdge} className={`${itemClass} text-red-600 dark:text-red-400`}>
            <X size={16} />
            Delete Connection
          </button>
        </div>
      )}

      {type === 'pane' && (
        <div className="flex flex-col py-1">
          <button onClick={handleAddNode} className={itemClass}>
            <Plus size={16} className="text-slate-400 dark:text-slate-500" />
            New Note
          </button>
          <button onClick={handleAutoLayout} className={itemClass}>
            <Layout size={16} className="text-slate-400 dark:text-slate-500" />
            Auto Layout
          </button>
          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
          <button onClick={handleClearCanvas} className={`${itemClass} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}>
             <Eraser size={16} />
             Clear Canvas
          </button>
        </div>
      )}
    </div>
  );
}