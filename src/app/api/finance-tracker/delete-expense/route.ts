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

export async function DELETE(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({
        message: 'Unauthorized',
        error: 'You must be logged in to delete expenses'
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

    // Get expense ID from URL
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        message: 'Invalid expense ID',
        error: 'A valid expense ID is required'
      }, { status: 400 });
    }

    const expenseId = parseInt(id);

    // Delete expense record from database
    await DatabaseService.deleteExpense(expenseId, user.id);

    return NextResponse.json({
      message: 'Expense deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({
      message: 'Error deleting expense',
      errorType: 'DATABASE_ERROR',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
