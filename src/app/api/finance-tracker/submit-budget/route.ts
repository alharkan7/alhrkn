import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { DatabaseService } from '@/app/finance-tracker/lib/database';

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: any) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({
        message: 'Unauthorized',
        error: 'You must be logged in to submit budget data'
      }, { status: 401 });
    }

    // Get user from database
    const user = await DatabaseService.findUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json({
        message: 'User not found',
        error: 'Your account could not be found in the database'
      }, { status: 404 });
    }

    const body = await req.json();
    const { date, amount, notes } = body;

    // Validate required fields
    if (!date || typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({
        message: 'Invalid data',
        error: 'Date and valid amount are required'
      }, { status: 400 });
    }

    // Format timestamp
    const now = new Date();
    const timestamp = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');

    // Use upsert budget to handle monthly budget updates
    const budget = await DatabaseService.upsertBudget({
      user_id: user.id,
      timestamp,
      date,
      amount,
      notes: notes || null,
      budget_type: 'monthly',
      source: 'manual'
    });

    return NextResponse.json({
      message: 'Budget data saved successfully',
      budget
    });

  } catch (error: any) {
    console.error('Error submitting budget data:', error);

    return NextResponse.json({
      message: 'Error submitting budget data',
      errorType: 'DATABASE_ERROR',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
