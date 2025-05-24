import { EXAMPLE_MINDMAP } from '../data/sampleMindmap';
import MindmapClientView from '../[id]/MindmapClientView';

export default function ExampleMindmapPage() {
  return (
    <MindmapClientView
      mindMapNodes={EXAMPLE_MINDMAP.nodes}
      mindmapTitle="Example: Steve Jobs' Stanford Commencement Speech"
    />
  );
} 