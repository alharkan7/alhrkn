import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(req: NextRequest) {
  try {
    // Connect to MySQL database
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DB || 'dnanalyzer',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    try {
      // Extract documents
      const [documents] = await connection.execute(`
        SELECT ID, Title, Text, Author, Source, Section, Notes, Type, Date
        FROM DOCUMENTS
        ORDER BY ID
      `);

      const formattedDocuments = (documents as any[]).map((doc: any) => ({
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
      const [rawStatements] = await connection.execute(`
        SELECT
          s.ID,
          s.DocumentId,
          d.Title as sourceFile,
          COALESCE(p_entity.Value, '') as actor,
          COALESCE(o_entity.Value, '') as organization,
          COALESCE(c_entity.Value, '') as concept,
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

      // For each statement, get the actual statement text
      // We need to reconstruct this from the available data
      const statements = (rawStatements as any[]).map((stmt: any) => ({
        statement: `Statement by ${stmt.actor || 'Unknown'}${stmt.organization ? ` from ${stmt.organization}` : ''} regarding ${stmt.concept || 'topic'}`,
        concept: stmt.concept || '',
        actor: stmt.actor || '',
        organization: stmt.organization || '',
        agree: stmt.agree,
        sourceFile: stmt.sourceFile
      }));

      return new Response(JSON.stringify({
        success: true,
        documents: formattedDocuments,
        statements: statements,
        message: `Loaded ${statements.length} statements from ${formattedDocuments.length} documents`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } finally {
      await connection.end();
    }

  } catch (error: any) {
    console.error('Error loading from database:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
