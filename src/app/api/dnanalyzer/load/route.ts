import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('dnaFile') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!file.name.endsWith('.dna')) {
      return new Response(JSON.stringify({ error: 'File must be a .dna file' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Save uploaded file temporarily
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `load-${Date.now()}.dna`);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempFilePath, buffer);

    try {
      // Open the database
      const db = new Database(tempFilePath, { readonly: true });

      // Extract documents
      const documentsStmt = db.prepare(`
        SELECT ID, Title, Text, Author, Source, Section, Notes, Type, Date
        FROM DOCUMENTS
        ORDER BY ID
      `);
      const documents = documentsStmt.all().map((doc: any) => ({
        id: doc.ID,
        title: doc.Title,
        content: doc.Text,
        author: doc.Author,
        source: doc.Source,
        section: doc.Section,
        notes: doc.Notes,
        type: doc.Type,
        date: doc.Date
      }));

      // Extract statements with their data
      const statementsStmt = db.prepare(`
        SELECT
          s.ID,
          s.DocumentId,
          d.Title as sourceFile,
          COALESCE(p_entity.Name, '') as actor,
          COALESCE(o_entity.Name, '') as organization,
          COALESCE(c_entity.Name, '') as concept,
          CASE WHEN agreement.Value = 1 THEN true ELSE false END as agree
        FROM STATEMENTS s
        LEFT JOIN DOCUMENTS d ON s.DocumentId = d.ID
        LEFT JOIN DATASHORTTEXT p_data ON s.ID = p_data.StatementId AND p_data.VariableId = 1
        LEFT JOIN ENTITIES p_entity ON p_data.Entity = p_entity.ID
        LEFT JOIN DATASHORTTEXT o_data ON s.ID = o_data.StatementId AND o_data.VariableId = 2
        LEFT JOIN ENTITIES o_entity ON o_data.Entity = o_entity.ID
        LEFT JOIN DATASHORTTEXT c_data ON s.ID = c_data.StatementId AND c_data.VariableId = 3
        LEFT JOIN ENTITIES c_entity ON c_data.Entity = c_entity.ID
        LEFT JOIN DATABOOLEAN agreement ON s.ID = agreement.StatementId AND agreement.VariableId = 4
        ORDER BY s.ID
      `);

      const rawStatements = statementsStmt.all();

      // For each statement, get the actual statement text
      // We need to reconstruct this from the available data
      const statements = rawStatements.map((stmt: any) => ({
        statement: `Statement by ${stmt.actor || 'Unknown'}${stmt.organization ? ` from ${stmt.organization}` : ''} regarding ${stmt.concept || 'topic'}`,
        concept: stmt.concept || '',
        actor: stmt.actor || '',
        organization: stmt.organization || '',
        agree: stmt.agree,
        sourceFile: stmt.sourceFile
      }));

      db.close();

      return new Response(JSON.stringify({
        success: true,
        documents: documents,
        statements: statements,
        message: `Loaded ${statements.length} statements from ${documents.length} documents`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

  } catch (error: any) {
    console.error('Error loading from database:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
