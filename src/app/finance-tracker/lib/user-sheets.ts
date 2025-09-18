import { DatabaseService } from './database';

interface UserSheet {
  userId: string;
  email: string;
  sheetId: string;
  createdAt: string;
  updatedAt: string;
}

export async function getUserSheet(userId: string): Promise<UserSheet | null> {
  try {
    // userId is the email in our current implementation
    const email = userId;
    const user = await DatabaseService.findUserByEmail(email);
    
    if (!user || !user.sheet_id) {
      return null;
    }

    return {
      userId: email,
      email: user.email,
      sheetId: user.sheet_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  } catch (error) {
    console.error('Error reading user sheet from database:', error);
    return null;
  }
}

export async function setUserSheet(userId: string, email: string, sheetId: string): Promise<UserSheet> {
  try {
    console.log('Setting user sheet for:', { userId, email, sheetId });
    
    // userId is the email in our current implementation
    const userEmail = userId;
    const updatedUser = await DatabaseService.setUserSheetId(userEmail, sheetId);
    
    console.log('Successfully saved user sheet configuration to database');
    
    return {
      userId: userEmail,
      email: updatedUser.email,
      sheetId: updatedUser.sheet_id!,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at
    };
  } catch (error) {
    console.error('Error saving user sheet to database:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack'
    });
    
    throw error;
  }
}

export async function removeUserSheet(userId: string): Promise<boolean> {
  try {
    // userId is the email in our current implementation
    const email = userId;
    const user = await DatabaseService.findUserByEmail(email);
    
    if (!user || !user.sheet_id) {
      return false; // No sheet found for user
    }
    
    await DatabaseService.removeUserSheetId(email);
    console.log('Successfully removed user sheet from database');
    return true;
  } catch (error) {
    console.error('Error removing user sheet from database:', error);
    return false;
  }
}

export async function getAllUserSheets(): Promise<UserSheet[]> {
  try {
    const result = await DatabaseService.getUsers({ has_sheet: true });
    
    return result.data.map(user => ({
      userId: user.email,
      email: user.email,
      sheetId: user.sheet_id!,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));
  } catch (error) {
    console.error('Error reading all user sheets from database:', error);
    return [];
  }
}

// Helper function to generate a unique user ID from session
export function getUserId(session: any): string {
  // Use email as unique identifier, or you could use session.user.id if available
  return session.user.email;
}
