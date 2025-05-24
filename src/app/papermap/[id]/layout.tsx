import { db } from '@/db';
import { mindmaps } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const mindmap = await db.query.mindmaps.findFirst({ where: eq(mindmaps.id, params.id) });
  const title = mindmap?.title ? `Papermap - ${mindmap.title}` : 'Papermap - Interactive AI Mindmap';
  return {
    title,
    description: 'Learn Anything with Interactive AI Mindmap',
  };
}

export default function MindmapIdLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full">
        {children}
      </main>
    </div>
  );
} 