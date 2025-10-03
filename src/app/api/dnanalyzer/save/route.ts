import { NextRequest, NextResponse } from 'next/server';
import { DNAnalyzerDB, Statement } from '@/lib/dnanalyzer-db';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documents, exportPath } = body || {};

    if (!documents || !Array.isArray(documents)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "documents" parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a temporary database file
    const tempDbPath = path.join(process.cwd(), 'temp-analysis.db');
    const db = new DNAnalyzerDB(tempDbPath);

    try {
      await db.initialize();

      // Save each document and its statements
      for (const doc of documents) {
        if (!doc.title || !doc.content) {
          continue;
        }

        const documentId = await db.saveDocument(doc.title, doc.content);

        if (doc.statements && Array.isArray(doc.statements)) {
          await db.saveStatements(documentId, doc.statements);
        }
      }

      // Export to .dna file if exportPath is provided
      if (exportPath) {
        // For export, we return the database file as a downloadable blob
        await db.close();

        // Read the database file and return it as a download
        const dbBuffer = fs.readFileSync(tempDbPath);
        const filename = exportPath.endsWith('.dna') ? exportPath : `${exportPath}.dna`;

        // Clean up temp file
        fs.unlinkSync(tempDbPath);

        return new Response(dbBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      }

      // If no export path, return success without file
      return new Response(JSON.stringify({
        success: true,
        message: 'Data saved to temporary database'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } finally {
      await db.close();

      // Clean up temporary file if it exists and no export path was provided
      if (!exportPath && fs.existsSync(tempDbPath)) {
        fs.unlinkSync(tempDbPath);
      }
    }

  } catch (error: any) {
    console.error('Error saving to database:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
