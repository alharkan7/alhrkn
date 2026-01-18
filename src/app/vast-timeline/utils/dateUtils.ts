// Helper to turn various date formats into a float year
// Negative for BCE/BP, Positive for CE
export const parseHistoricalDate = (dateStr: string): number => {
    const cleanStr = dateStr.trim().toUpperCase();
    const currentYear = 2024;
  
    // Handle "MYA" (Million Years Ago)
    if (cleanStr.includes('MYA')) {
      const num = parseFloat(cleanStr.replace('MYA', '').trim());
      return -1 * num * 1_000_000;
    }
  
    // Handle "BP" (Before Present). Assuming Present = 1950 for standard BP, 
    // but for general history often just means "ago". Let's use 1950 as base or just subtract from now.
    // Standard scientific BP is before 1950.
    if (cleanStr.includes('BP')) {
      const num = parseFloat(cleanStr.replace(/,/g, '').replace('BP', '').trim());
      return 1950 - num;
    }
  
    // Handle "BCE"
    if (cleanStr.includes('BCE')) {
      const num = parseFloat(cleanStr.replace('BCE', '').trim());
      return -num;
    }
  
    // Handle "CE"
    if (cleanStr.includes('CE')) {
      const num = parseFloat(cleanStr.replace('CE', '').trim());
      return num;
    }
  
    // Handle "YYYY-MM-DD" or "YYYY-MM"
    if (cleanStr.match(/^\d{4}/)) {
      const parts = cleanStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
      const day = parts[2] ? parseInt(parts[2], 10) : 1;
      
      // Simple fractional year
      const dayOfYear = (month * 30) + day; // Approx
      return year + (dayOfYear / 365.25);
    }
  
    return 0;
  };
  