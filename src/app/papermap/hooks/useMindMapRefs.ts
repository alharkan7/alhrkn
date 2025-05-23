'use client';

import { useRef } from 'react';
import { NodePosition } from '../types';

export function useMindMapRefs() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<any>(null); // Consider using a more specific type if available from ReactFlow
  const addFollowUpNodeRef = useRef<(
    parentId: string, 
    question: string, 
    answer: string, 
    customNodeId?: string
  ) => string>(
    () => { 
      console.error("addFollowUpNode called before initialization"); 
      return ''; // Return a default string (like an empty ID or error indicator)
    }
  );
  const deleteNodeRef = useRef<(nodeId: string) => void>(
    () => { 
      console.error("deleteNode called before initialization"); 
    }
  );
  const previousLayoutIndexRef = useRef<number>(0);
  const positionsToApplyRef = useRef<Record<string, NodePosition>>({});

  return {
    reactFlowWrapper,
    reactFlowInstance,
    addFollowUpNodeRef,
    deleteNodeRef,
    previousLayoutIndexRef,
    positionsToApplyRef,
  };
}
