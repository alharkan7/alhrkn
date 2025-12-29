import Joi from 'joi';
import sanitizeHtml from 'sanitize-html';
import _ from 'lodash';

/**
 * Security and safety measures for dynamic LLM data analysis
 */

// Maximum limits to prevent resource exhaustion
export const SAFETY_LIMITS = {
  MAX_CSV_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ROWS: 50000,
  MAX_COLUMNS: 100,
  MAX_QUERY_LENGTH: 1000,
  MAX_FUNCTION_CALLS: 10,
  MAX_EXECUTION_TIME: 30000, // 30 seconds
  MAX_MEMORY_USAGE: 2 * 1024 * 1024 * 1024 // 2GB - realistic for Next.js apps with dependencies
};

// Input validation schemas
export const inputSchemas = {
  userQuery: Joi.string()
    .min(1)
    .max(SAFETY_LIMITS.MAX_QUERY_LENGTH)
    .pattern(/^[\w\s\-.,!?()\[\]{}:;"'@#$%^&*+=<>\/\\|~`]*$/)
    .required(),
    
  csvData: Joi.array()
    .items(Joi.object())
    .max(SAFETY_LIMITS.MAX_ROWS)
    .required(),
    
  functionCall: Joi.object({
    name: Joi.string().alphanum().max(50).required(),
    parameters: Joi.object().max(20).required()
  })
};

/**
 * Sanitizes user input to prevent XSS and injection attacks
 */
export function sanitizeUserInput(input: string): string {
  // Remove HTML tags and potentially dangerous characters
  const sanitized = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  });
  
  // Additional sanitization for data analysis context
  return sanitized
    .replace(/[<>"']/g, '') // Remove remaining dangerous characters
    .replace(/\b(eval|exec|function|script|javascript|vbscript)\b/gi, '') // Remove script-related keywords
    .trim();
}

/**
 * Validates CSV data structure and size
 */
export function validateCsvData(csvData: any[]): { valid: boolean; error?: string } {
  if (!Array.isArray(csvData)) {
    return { valid: false, error: 'CSV data must be an array' };
  }
  
  if (csvData.length === 0) {
    return { valid: false, error: 'CSV data cannot be empty' };
  }
  
  if (csvData.length > SAFETY_LIMITS.MAX_ROWS) {
    return { valid: false, error: `CSV data exceeds maximum rows limit (${SAFETY_LIMITS.MAX_ROWS})` };
  }
  
  // Check column count
  const firstRow = csvData[0];
  if (typeof firstRow === 'object' && firstRow !== null) {
    const columnCount = Object.keys(firstRow).length;
    if (columnCount > SAFETY_LIMITS.MAX_COLUMNS) {
      return { valid: false, error: `CSV data exceeds maximum columns limit (${SAFETY_LIMITS.MAX_COLUMNS})` };
    }
  }
  
  return { valid: true };
}

/**
 * Validates function call parameters to prevent malicious code execution
 */
export function validateFunctionCall(functionCall: any): { valid: boolean; error?: string } {
  const { error } = inputSchemas.functionCall.validate(functionCall);
  if (error) {
    return { valid: false, error: error.details[0].message };
  }
  
  // Check for potentially dangerous parameter values
  const dangerousPatterns = [
    /eval\s*\(/i,
    /exec\s*\(/i,
    /function\s*\(/i,
    /\$\{.*\}/,
    /\bimport\b/i,
    /\brequire\b/i,
    /\bprocess\b/i,
    /\b__.*__\b/,
    /\.\.\//
  ];
  
  const paramString = JSON.stringify(functionCall.parameters);
  for (const pattern of dangerousPatterns) {
    if (pattern.test(paramString)) {
      return { valid: false, error: 'Function parameters contain potentially dangerous content' };
    }
  }
  
  return { valid: true };
}

/**
 * Rate limiting for API calls
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  
  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }
  
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Memory usage monitor
 */
export function checkMemoryUsage(): { safe: boolean; usage: number } {
  const usage = process.memoryUsage();
  const totalUsage = usage.heapUsed + usage.external;
  
  return {
    safe: totalUsage < SAFETY_LIMITS.MAX_MEMORY_USAGE,
    usage: totalUsage
  };
}

/**
 * Execution timeout wrapper
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number = SAFETY_LIMITS.MAX_EXECUTION_TIME): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    })
  ]);
}

/**
 * Sanitizes analysis results before returning to client
 */
export function sanitizeAnalysisResult(result: any): any {
  if (typeof result !== 'object' || result === null) {
    return result;
  }
  
  const sanitized = _.cloneDeep(result);
  
  // Remove any potentially sensitive information
  const sensitiveKeys = ['apiKey', 'token', 'password', 'secret', 'key'];
  
  function removeSensitiveData(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(removeSensitiveData);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (!sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          cleaned[key] = removeSensitiveData(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }
  
  return removeSensitiveData(sanitized);
}

/**
 * Comprehensive safety check for the entire analysis pipeline
 */
export function performSafetyCheck(input: {
  userQuery: string;
  csvData?: any[];
  hasData?: boolean;
  clientId?: string;
}): { safe: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Rate limiting check
  if (input.clientId && !rateLimiter.isAllowed(input.clientId)) {
    errors.push('Rate limit exceeded. Please try again later.');
  }
  
  // Memory usage check
  const memoryCheck = checkMemoryUsage();
  if (!memoryCheck.safe) {
    errors.push('System memory usage is too high. Please try again later.');
  }
  
  // Input validation
  const queryValidation = inputSchemas.userQuery.validate(input.userQuery);
  if (queryValidation.error) {
    errors.push(`Invalid query: ${queryValidation.error.details[0].message}`);
  }
  
  // Only validate CSV data if we're using the old approach (csvData provided)
  if (input.csvData !== undefined) {
    const csvValidation = validateCsvData(input.csvData);
    if (!csvValidation.valid) {
      errors.push(csvValidation.error!);
    }
  }
  // For metadata approach, just check if hasData is true when expected
  else if (input.hasData === false) {
    errors.push('No data provided for analysis');
  }
  
  return {
    safe: errors.length === 0,
    errors
  };
}

/**
 * Error handler for safe error reporting
 */
export function createSafeError(error: any, context: string): { message: string; code: string } {
  // Don't expose internal error details to prevent information leakage
  const safeMessages: Record<string, string> = {
    'CSV parsing failed': 'The CSV file format is invalid. Please check your data and try again.',
    'Analysis failed': 'Unable to analyze the data. Please try a different query.',
    'Visualization failed': 'Unable to create visualization. Please try a different chart type.',
    'Rate limit exceeded': 'Too many requests. Please wait before trying again.',
    'Memory limit exceeded': 'Data is too large to process. Please try with a smaller dataset.',
    'Timeout': 'The analysis is taking too long. Please try with a simpler query.'
  };
  
  const errorMessage = error?.message || 'Unknown error';
  const safeMessage = safeMessages[errorMessage] || 'An error occurred while processing your request.';
  
  // Log the actual error for debugging (server-side only)
  console.error(`[${context}] Error:`, error);
  
  return {
    message: safeMessage,
    code: 'ANALYSIS_ERROR'
  };
}