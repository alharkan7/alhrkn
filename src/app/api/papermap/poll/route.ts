import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mindmapNodes } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * API endpoint to poll for mindmap nodes
 * Used by the client to get real-time updates during streaming
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mindmapId = searchParams.get('mindmapId');
    const knownCount = parseInt(searchParams.get('knownCount') || '0', 10);

    if (!mindmapId) {
        return NextResponse.json({ error: 'mindmapId is required' }, { status: 400 });
    }

    try {
        // Fetch all nodes for this mindmap
        const nodes = await db.query.mindmapNodes.findMany({
            where: eq(mindmapNodes.mindmapId, mindmapId),
        });

        // Transform to client format
        const clientNodes = nodes.map((n) => ({
            id: n.nodeId,
            title: n.title,
            description: n.description ?? '',
            parentId: n.parentId,
            level: n.level,
            pageNumber: n.pageNumber ?? undefined,
        }));

        // Determine if there are new nodes
        const hasNewNodes = clientNodes.length > knownCount;

        return NextResponse.json({
            nodes: clientNodes,
            count: clientNodes.length,
            hasNewNodes,
        });
    } catch (error) {
        console.error('Error polling mindmap nodes:', error);
        return NextResponse.json(
            { error: 'Failed to fetch nodes' },
            { status: 500 }
        );
    }
}
