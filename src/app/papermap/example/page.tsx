import React from 'react';
import { EXAMPLE_MINDMAP, EXAMPLE_PDF_URL, EXAMPLE_PDF_TEXT } from '../data/sampleMindmap';
import MindmapClientView from '../[id]/MindmapClientView';

export default function ExampleMindmapPage() {
  const exampleTitle = "Example: Steve Jobs' Stanford Commencement Speech";
  return (
    <div className="h-screen w-full">
      <React.Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
        <MindmapClientView
          mindMapNodes={EXAMPLE_MINDMAP.nodes}
          mindmapTitle={exampleTitle}
          mindmapInputType="pdf"
          mindmapPdfUrl={EXAMPLE_PDF_URL}
          mindmapSourceUrl={undefined}
          mindmapExpiresAt={undefined}
          mindmapParsedPdfContent={EXAMPLE_PDF_TEXT}
        />
      </React.Suspense>
    </div>
  );
} 