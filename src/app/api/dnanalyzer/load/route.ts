import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { DNAnalyzerDB } from '@/lib/dnanalyzer-db';

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to user's MySQL database
    const db = new DNAnalyzerDB(session.user.email);

    try {
      await db.initialize();
      const connection = db.getConnection();

      if (!connection) {
        throw new Error('Failed to establish database connection');
      }

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
          s.Start as startIndex,
          s.Stop as endIndex,
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

      // For each statement, extract the actual text from the document using Start/Stop positions
      const statements = (rawStatements as any[]).map((stmt: any) => {
        // Find the corresponding document to extract the statement text
        const document = formattedDocuments.find((doc: any) => doc.title === stmt.sourceFile);
        let statementText = `Statement by ${stmt.actor || 'Unknown'}${stmt.organization ? ` from ${stmt.organization}` : ''} regarding ${stmt.concept || 'topic'}`;

        // If we have valid start/end indices and the document, extract the actual text
        if (document && stmt.startIndex >= 0 && stmt.endIndex > stmt.startIndex && stmt.endIndex <= document.content.length) {
          statementText = document.content.substring(stmt.startIndex, stmt.endIndex);
        }

        return {
          statement: statementText,
          concept: stmt.concept || '',
          actor: stmt.actor || '',
          organization: stmt.organization || '',
          agree: stmt.agree,
          sourceFile: stmt.sourceFile,
          startIndex: stmt.startIndex || 0,
          endIndex: stmt.endIndex || 0,
          originalStatementId: stmt.ID // Include the original statement ID
        };
      });

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
        // Connection will be closed by db.close()
      }

    } finally {
      await db.close();
    }

  } catch (error: any) {
    console.error('Error loading from database:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
