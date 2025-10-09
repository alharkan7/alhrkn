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

    const { mysqlConfig, googleApiKey } = await DNAnalyzerDB.getUserConfig(session.user.email);

    return NextResponse.json({
      mysqlConfig: mysqlConfig || null,
      googleApiKey: googleApiKey || null
    });
  } catch (error: any) {
    console.error('Error fetching user config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user configuration' },
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
    const { mysqlConfig, googleApiKey } = body;

    // At least one of MySQL config or Google API key must be provided
    if (!mysqlConfig && !googleApiKey) {
      return NextResponse.json(
        { error: 'Either MySQL configuration or Google API key must be provided' },
        { status: 400 }
      );
    }

    // If MySQL config is provided, validate it
    if (mysqlConfig) {
      const requiredFields = ['host', 'user', 'password', 'database'];
      const missingFields = requiredFields.filter(field => !mysqlConfig[field]);

      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: `Missing required MySQL fields: ${missingFields.join(', ')}` },
          { status: 400 }
        );
      }

      // Test the MySQL connection before saving
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
    }

    // If Google API key is provided, validate it's not empty
    if (googleApiKey && typeof googleApiKey !== 'string') {
      return NextResponse.json(
        { error: 'Google API key must be a string' },
        { status: 400 }
      );
    }

    // Save the configuration
    await DNAnalyzerDB.saveUserConfig(session.user.email, mysqlConfig || {}, googleApiKey);

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
