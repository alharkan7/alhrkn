import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { timestamp, subject, date, amount, category, description } = body;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, '\n'), // Replace newline characters
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const sheetId = process.env.GOOGLE_SHEETS_ID; // Replace with your Google Sheets ID
    const range = 'Incomes!A:E'; // Change this to 'Sheet1!A1:E1' for appending on new row

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      includeValuesInResponse: true,
      insertDataOption: 'INSERT_ROWS', // This should append new row
      requestBody: {
        values: [[timestamp, subject, date, amount, category, description]],
      },
    });

    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error('Detailed error:', {
      name: error instanceof Error ? error.name : 'Unknown Error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
    });
    return NextResponse.json({ 
      message: 'Error submitting data',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
