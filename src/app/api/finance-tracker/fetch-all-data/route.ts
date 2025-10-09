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

export async function GET(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({
        message: 'Unauthorized',
        error: 'You must be logged in to access this resource'
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

    // Parse query parameters for date filtering
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Fetch all finance data from database
    const financeData = await DatabaseService.getAllFinanceData(
      user.id,
      startDate || undefined,
      endDate || undefined
    );

    return NextResponse.json({
      ...financeData,
      message: 'All data fetched successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching all data:', error);
    return NextResponse.json({
      message: 'Error fetching data',
      errorType: 'DATABASE_ERROR',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
