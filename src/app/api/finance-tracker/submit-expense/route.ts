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
        error: 'You must be logged in to submit expenses'
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
    const { timestamp, date, amount, category, notes } = body;

    // Validate required fields
    if (!date || !amount || !category) {
      return NextResponse.json({
        message: 'Missing required fields',
        error: 'Date, amount, and category are required'
      }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({
        message: 'Invalid amount',
        error: 'Amount must be a positive number'
      }, { status: 400 });
    }

    // Create expense record in database
    const expense = await DatabaseService.createExpense({
      user_id: user.id,
      timestamp: timestamp || null,
      date,
      amount,
      category,
      description: notes || null,
      source: 'manual'
    });

    return NextResponse.json({ 
      message: 'Expense created successfully',
      expense
    }, { status: 200 });

  } catch (error) {
    console.error('Error submitting expense:', error);
    return NextResponse.json({
      message: 'Error submitting expense',
      errorType: 'DATABASE_ERROR',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
