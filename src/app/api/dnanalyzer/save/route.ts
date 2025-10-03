import { NextRequest, NextResponse } from 'next/server';
import { DNAnalyzerDB, Statement } from '@/lib/dnanalyzer-db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documents } = body || {};

    if (!documents || !Array.isArray(documents)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "documents" parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Connect to MySQL database
    const db = new DNAnalyzerDB();

    try {
      await db.initialize();

      // Save each document and its statements
      const savedDocuments = [];
      for (const doc of documents) {
        if (!doc.title || !doc.content) {
          continue;
        }

        const documentId = await db.saveDocument(doc.title, doc.content);

        if (doc.statements && Array.isArray(doc.statements)) {
          await db.saveStatements(documentId, doc.statements);
        }

        savedDocuments.push({
          id: documentId,
          title: doc.title,
          statementsCount: doc.statements?.length || 0
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Saved ${savedDocuments.length} documents with ${savedDocuments.reduce((sum, doc) => sum + doc.statementsCount, 0)} statements to MySQL database`,
        documents: savedDocuments
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } finally {
      await db.close();
    }

  } catch (error: any) {
    console.error('Error saving to database:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
