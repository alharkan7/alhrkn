import { EXAMPLE_MINDMAP, EXAMPLE_PDF_URL } from '../data/sampleMindmap';
import MindmapClientView from '../[id]/MindmapClientView';

export default function ExampleMindmapPage() {
  const exampleTitle = "Example: Steve Jobs' Stanford Commencement Speech";
  return (
    <MindmapClientView
      mindMapNodes={EXAMPLE_MINDMAP.nodes}
      mindmapTitle={exampleTitle}
      mindmapInputType="pdf"
      mindmapPdfUrl={EXAMPLE_PDF_URL}
      mindmapSourceUrl={undefined}
    />
  );
} 