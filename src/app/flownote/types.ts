import { Node, Edge } from 'reactflow';

export interface NoteData {
  title: string;
  content: string;
  color?: string; // Optional: for different sticky note colors
}

export type NoteNode = Node<NoteData>;

export interface ContextMenuProps {
  id: string | null;
  top: number;
  left: number;
  right: number;
  bottom: number;
  type: 'node' | 'pane' | 'edge';
  hasChildren?: boolean;
}

// Initial nodes are now loaded from /public/flownote-initial.md
export const INITIAL_NODES: NoteNode[] = [];