import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { DNAnalyzerDB, Statement } from '@/lib/dnanalyzer-db';

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

    const body = await req.json();
    const { documents } = body || {};

    if (!documents || !Array.isArray(documents)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "documents" parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Connect to user's MySQL database
    const db = new DNAnalyzerDB(session.user.email);

    try {
      await db.initialize();

      // Save each document and its statements
      const savedDocuments = [];
      for (const doc of documents) {
        if (!doc.title || !doc.content) {
          continue;
        }

        let documentId: number;

        // Check if this is an update (has existing ID) or a new document
        if (doc.id && typeof doc.id === 'number') {
          // Update existing document
          await db.updateDocument(doc.id, doc.title, doc.content);
          documentId = doc.id;

          // For updates, handle statements individually
          if (doc.statements && Array.isArray(doc.statements)) {
            for (const statement of doc.statements) {
              if (statement.originalStatementId && typeof statement.originalStatementId === 'number') {
                // Update existing statement
                await db.updateStatement(statement.originalStatementId, statement);
              } else {
                // Insert new statement
                await db.saveSingleStatement(documentId, statement);
              }
            }
          }
        } else {
          // Create new document
          documentId = await db.saveDocument(doc.title, doc.content);

          if (doc.statements && Array.isArray(doc.statements)) {
            await db.saveStatements(documentId, doc.statements);
          }
        }

        savedDocuments.push({
          id: documentId,
          title: doc.title,
          statementsCount: doc.statements?.length || 0,
          isUpdate: !!doc.id
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
