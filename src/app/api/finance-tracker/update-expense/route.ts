import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { DatabaseService } from '@/lib/database';

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

export async function PUT(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({
        message: 'Unauthorized',
        error: 'You must be logged in to update expenses'
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
    const { id, date, amount, category, description } = body;

    // Validate required fields
    if (!id || !date || !amount || !category) {
      return NextResponse.json({
        message: 'Missing required fields',
        error: 'ID, date, amount, and category are required'
      }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({
        message: 'Invalid amount',
        error: 'Amount must be a positive number'
      }, { status: 400 });
    }

    // Update expense record in database
    const updatedExpense = await DatabaseService.updateExpense(id, user.id, {
      date,
      amount,
      category,
      description: description || null
    });

    return NextResponse.json({
      message: 'Expense updated successfully',
      expense: updatedExpense
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({
      message: 'Error updating expense',
      errorType: 'DATABASE_ERROR',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
