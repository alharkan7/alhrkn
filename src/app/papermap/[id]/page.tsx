import { db } from '@/db';
import { mindmaps, mindmapNodes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { MindMapNode } from '../types';
import MindmapClientView from './MindmapClientView';

interface PageProps {
  params: { id: string };
}

export default async function MindmapIdPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  
    // Fetch mindmap and nodes from DB
    const mindmap = await db.query.mindmaps.findFirst({ where: eq(mindmaps.id, id) });
    if (!mindmap) return <div>Not found</div>;
    const nodesRaw = await db.query.mindmapNodes.findMany({ where: eq(mindmapNodes.mindmapId, id) });
  
  // Convert DB nodes to MindMapNode type for context
  const mindMapNodes: MindMapNode[] = nodesRaw.map((n) => ({
    id: n.nodeId,
    title: n.title,
    description: n.description ?? '',
    parentId: n.parentId,
    level: n.level,
    pageNumber: n.pageNumber ?? undefined,
  }));

  return <MindmapClientView 
    mindMapNodes={mindMapNodes} 
    mindmapTitle={mindmap.title ?? 'Mindmap'} 
    mindmapInputType={mindmap.inputType}
    mindmapPdfUrl={mindmap.pdfUrl ?? undefined} 
    mindmapSourceUrl={mindmap.sourceUrl ?? undefined}
    mindmapExpiresAt={mindmap.expiresAt ? mindmap.expiresAt.toISOString() : undefined}
    mindmapParsedPdfContent={mindmap.parsed_pdf_content ?? undefined}
  />;
} 