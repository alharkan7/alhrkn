import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { DNAnalyzerDB } from '@/lib/dnanalyzer-db';
import mysql from 'mysql2/promise';

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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const mysqlConfig = await DNAnalyzerDB.getUserMySQLConfig(session.user.email);

    if (!mysqlConfig) {
      return NextResponse.json(
        { error: 'MySQL configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ mysqlConfig });
  } catch (error: any) {
    console.error('Error fetching MySQL config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch MySQL configuration' },
      { status: 500 }
    );
  }
}

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
    const { mysqlConfig } = body;

    if (!mysqlConfig) {
      return NextResponse.json(
        { error: 'MySQL configuration is required' },
        { status: 400 }
      );
    }

    // Validate MySQL config structure
    const requiredFields = ['host', 'user', 'password', 'database'];
    const missingFields = requiredFields.filter(field => !mysqlConfig[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Test the connection before saving
    try {
      const testConnection = await mysql.createConnection({
        ...mysqlConfig,
        connectTimeout: 5000, // 5 second timeout
      });
      await testConnection.end();
    } catch (connectionError: any) {
      return NextResponse.json(
        { error: `Failed to connect to MySQL database: ${connectionError.message}` },
        { status: 400 }
      );
    }

    // Save the configuration
    await DNAnalyzerDB.saveUserMySQLConfig(session.user.email, mysqlConfig);

    return NextResponse.json({
      success: true,
      message: 'MySQL configuration saved successfully'
    });
  } catch (error: any) {
    console.error('Error saving MySQL config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save MySQL configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  // PUT is same as POST for this endpoint
  return POST(req);
}
