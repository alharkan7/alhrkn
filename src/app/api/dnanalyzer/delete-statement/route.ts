import { NextRequest } from 'next/server';
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

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { statementId } = body || {};

    if (!statementId || typeof statementId !== 'number') {
      return new Response(JSON.stringify({ error: 'Missing or invalid "statementId" parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize database connection
    const db = new DNAnalyzerDB(session.user.email);
    await db.initialize();

    try {
      // Delete the statement and all associated data
      await db.deleteStatement(statementId);

      return new Response(JSON.stringify({
        success: true,
        message: 'Statement deleted successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } finally {
      await db.close();
    }

  } catch (error: any) {
    console.error('Error in /api/dnanalyzer/delete-statement:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
