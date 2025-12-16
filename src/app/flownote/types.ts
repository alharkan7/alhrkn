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

export const INITIAL_NODES: NoteNode[] = [
  {
    id: '1',
    type: 'note',
    position: { x: 100, y: 100 },
    data: { 
      title: 'Welcome to FlowNote', 
      content: '<p>This is a <strong>rich text</strong> sticky note.</p><ul><li>Select text to format</li><li>Right click to menu</li><li>Drag handles to connect</li><li>Double click to edit</li></ul>' 
    },
    style: { width: 250, height: 200 },
  },
  {
    id: '2',
    type: 'note',
    position: { x: 500, y: 200 },
    data: { title: 'Child Node', content: '<p>Connect me to the parent node to see me in the <em>sidebar view</em>!</p>' },
    style: { width: 200, height: 180 },
  },
];