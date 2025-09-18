import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { getUserSheet, setUserSheet, removeUserSheet, getUserId } from '@/lib/user-sheets';

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

// GET - Retrieve user's sheet configuration
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

    const userId = getUserId(session);
    const userSheet = await getUserSheet(userId);

    if (!userSheet) {
      return NextResponse.json({
        message: 'No sheet configured',
        hasSheet: false
      }, { status: 200 });
    }

    return NextResponse.json({
      message: 'Sheet configuration found',
      hasSheet: true,
      sheetId: userSheet.sheetId,
      createdAt: userSheet.createdAt,
      updatedAt: userSheet.updatedAt
    }, { status: 200 });

  } catch (error) {
    console.error('Error getting user sheet:', error);
    return NextResponse.json({
      message: 'Error retrieving sheet configuration',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST - Set user's sheet configuration
export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({
        message: 'Unauthorized',
        error: 'You must be logged in to configure sheets'
      }, { status: 401 });
    }

    const body = await req.json();
    const { sheetId } = body;

    if (!sheetId) {
      return NextResponse.json({
        message: 'Sheet ID required',
        error: 'Please provide a valid sheet ID'
      }, { status: 400 });
    }

    const userId = getUserId(session);
    const userSheet = await setUserSheet(userId, session.user.email!, sheetId);

    return NextResponse.json({
      message: 'Sheet configuration saved successfully',
      sheetId: userSheet.sheetId,
      createdAt: userSheet.createdAt,
      updatedAt: userSheet.updatedAt
    }, { status: 200 });

  } catch (error) {
    console.error('Error setting user sheet:', error);
    return NextResponse.json({
      message: 'Error saving sheet configuration',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// DELETE - Remove user's sheet configuration
export async function DELETE(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({
        message: 'Unauthorized',
        error: 'You must be logged in to remove sheet configuration'
      }, { status: 401 });
    }

    const userId = getUserId(session);
    const removed = await removeUserSheet(userId);

    if (!removed) {
      return NextResponse.json({
        message: 'No sheet configuration found to remove'
      }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Sheet configuration removed successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error removing user sheet:', error);
    return NextResponse.json({
      message: 'Error removing sheet configuration',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
