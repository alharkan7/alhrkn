import { NextRequest, NextResponse } from 'next/server';
import { 
  GoogleGenerativeAI, 
} from '@google/generative-ai';

// Define constants
const MAX_RETRIES = 3; // Maximum number of retries for API calls

// Add session management at the top of the file, after imports
const chatSessions = new Map();

// Session management configuration
const SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const SESSION_CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // Check every 10 minutes
const MAX_SESSIONS = 100; // Maximum number of concurrent sessions
let cleanupIntervalId: NodeJS.Timeout | null = null;

// Function to clean up expired sessions
function cleanupExpiredSessions() {
  const now = Date.now();
  let expiredCount = 0;
  const sessionEntries = Array.from(chatSessions.entries());
  
  // Sort sessions by lastAccessed time (oldest first) to prioritize removal
  sessionEntries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
  
  // Check if we need to enforce the max sessions limit
  if (sessionEntries.length > MAX_SESSIONS) {
    // Remove oldest sessions to get back under the limit
    const excessCount = sessionEntries.length - MAX_SESSIONS;
    const sessionsToRemove = sessionEntries.slice(0, excessCount);
    
    for (const [sessionId] of sessionsToRemove) {
      chatSessions.delete(sessionId);
      expiredCount++;
    }
  }
  
  // Remove sessions that have expired due to inactivity
  for (const [sessionId, sessionData] of chatSessions.entries()) {
    const sessionAge = now - sessionData.lastAccessed;
    if (sessionAge > SESSION_MAX_AGE_MS) {
      chatSessions.delete(sessionId);
      expiredCount++;
    }
  }
  
  // Log memory usage and session counts
  const memoryUsage = process.memoryUsage();
  console.log(`Session cleanup: removed ${expiredCount}, remaining ${chatSessions.size} sessions`);
  console.log(`Memory usage: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB RSS, ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB heap used`);
}

// Initialize the cleanup interval
function initializeSessionCleanup() {
  if (cleanupIntervalId === null) {
    cleanupIntervalId = setInterval(cleanupExpiredSessions, SESSION_CLEANUP_INTERVAL_MS);
    console.log("Session cleanup service initialized");
  }
}

// Start the cleanup interval when the module loads
initializeSessionCleanup();

// Helper function to extract JSON from text response
function extractJsonFromResponse(text: string): any {
  // Match JSON object pattern
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Failed to parse JSON match:", e);
      // Fall back to returning the original text in a structured format
      return { answer: text };
    }
  }
  
  // If no JSON object found, return the text as answer
  return { answer: text };
}

// Define the prompts
const MINDMAP_CREATION_PROMPT = `You are a helpful assistant that creates mindmaps from PDF documents. Your task is to analyze the PDF and create a structured mindmap that represents the key concepts and their relationships.

Please create a mindmap with the following structure:
1. The root node should be the main topic or title of the document
2. Each child node should represent a key concept or section
3. Include page numbers where each concept appears
4. Use clear, concise titles and descriptions
5. Maintain a logical hierarchy of concepts

Your response must be a valid JSON object with the following structure:
{
  "nodes": [
    {
      "id": "unique-id",
      "title": "node title",
      "description": "detailed description",
      "parentId": "parent-node-id or null for root",
      "level": 0,
      "pageNumber": 1
    }
  ]
}`;

const FOLLOWUP_PROMPT = `You are a helpful assistant that answers questions about PDF documents. Your task is to provide clear, concise answers based on the document content.

Please follow these guidelines:
1. Answer the question directly and concisely
2. Use information from the provided context and PDF
3. If the answer cannot be found in the document, say so
4. Keep your response focused and relevant

Your response must be a valid JSON object with the following structure:
{
  "answer": "your detailed answer here"
}`;

// Define schema types
type JsonSchemaType = 'string' | 'number' | 'integer' | 'array' | 'object';

interface JsonSchema {
  type: JsonSchemaType;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  nullable?: boolean;
}

// Define schemas for different response types
const mindmapNodeSchema: JsonSchema = {
    type: 'object',
    properties: {
        id: {
            type: 'string'
        },
        title: {
            type: 'string'
        },
        description: {
            type: 'string'
        },
        parentId: {
            type: 'string',
            nullable: true
        },
        level: {
            type: 'integer'
        },
        pageNumber: {
            type: 'integer',
            nullable: true
        }
    },
    required: ["id", "title", "description", "level"]
};

const mindmapResponseSchema: JsonSchema = {
    type: 'object',
    properties: {
        nodes: {
            type: 'array',
            items: mindmapNodeSchema
        }
    },
    required: ["nodes"]
};

const followUpResponseSchema: JsonSchema = {
    type: 'object',
    properties: {
        answer: {
            type: 'string'
        }
    },
    required: ["answer"]
};

// Helper function to validate JSON against a schema
function validateSchema(data: any, schema: JsonSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  function validateType(value: any, type: JsonSchemaType, propertyName: string, schema: JsonSchema): boolean {
    // Handle nullable fields
    if (schema.nullable && value === null) {
      return true;
    }

    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${propertyName} must be a string`);
          return false;
        }
        break;
      case 'integer':
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          errors.push(`${propertyName} must be an integer`);
          return false;
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${propertyName} must be an array`);
          return false;
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null) {
          errors.push(`${propertyName} must be an object`);
          return false;
        }
        break;
    }
    return true;
  }

  function validateObject(obj: any, schema: JsonSchema, path: string = ''): boolean {
    if (!validateType(obj, schema.type, path, schema)) {
      return false;
    }

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const value = obj[key];
        const fullPath = path ? `${path}.${key}` : key;

        if (schema.required?.includes(key) && value === undefined) {
          errors.push(`${fullPath} is required`);
          continue;
        }

        if (value !== undefined) {
          if (propSchema.type === 'object') {
            validateObject(value, propSchema, fullPath);
          } else if (propSchema.type === 'array') {
            if (propSchema.items) {
              value.forEach((item: any, index: number) => {
                validateObject(item, propSchema.items!, `${fullPath}[${index}]`);
              });
            }
          } else {
            validateType(value, propSchema.type, fullPath, propSchema);
          }
        }
      }
    }

    return errors.length === 0;
  }

  validateObject(data, schema);
  return { valid: errors.length === 0, errors };
}

/**
 * Processes a follow-up question to a node in the mindmap
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Gemini API key is configured
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Get request data
    const data = await request.json();
    const { blobUrl, fileName, isFollowUp, question, nodeContext, sessionId, cleanupSession } = data;

    // Check if this is a session cleanup request
    if (cleanupSession && sessionId) {
      if (chatSessions.has(sessionId)) {
        chatSessions.delete(sessionId);
        console.log(`Session ${sessionId} explicitly cleaned up by client`);
        return NextResponse.json({ success: true, message: "Session cleaned up successfully" });
      } else {
        return NextResponse.json({ success: false, message: "Session not found" }, { status: 404 });
      }
    }

    // Check if this is a follow-up question or initial mindmap creation
    if (isFollowUp) {
      if (!question) {
        return NextResponse.json(
          { error: "Question is required for follow-up" },
          { status: 400 }
        );
      }

      if (!nodeContext || !nodeContext.title || !nodeContext.description) {
        return NextResponse.json(
          { error: "Node context is required for follow-up" },
          { status: 400 }
        );
      }

      if (!sessionId) {
        return NextResponse.json(
          { error: "Session ID is required for follow-up" },
          { status: 400 }
        );
      }

      console.log(`Processing follow-up question about: ${nodeContext.title}`);
      
      try {
        // Retrieve existing session
        const sessionData = chatSessions.get(sessionId);
        if (!sessionData) {
          return NextResponse.json(
            { error: "Session expired or not found" },
            { status: 404 }
          );
        }

        // Update last accessed time
        sessionData.lastAccessed = Date.now();

        // Initialize Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        });

        // Send follow-up question with context
        const response = await model.generateContent([
          FOLLOWUP_PROMPT,
          {
            inlineData: {
              mimeType: "application/pdf",
              data: Buffer.from(sessionData.pdfBytes).toString('base64')
            }
          },
          `Context from previous conversation:\nTitle: ${nodeContext.title}\nDescription: ${nodeContext.description}\n\nQuestion: ${question}`
        ]);

        const responseText = response.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        const answer = JSON.parse(jsonMatch[0]);

        // Validate against follow-up response schema
        const validationResult = validateSchema(answer, followUpResponseSchema);
        if (!validationResult.valid) {
          throw new Error(`Invalid follow-up response schema: ${validationResult.errors.join(', ')}`);
        }

        return NextResponse.json({ 
          success: true, 
          answer: answer.answer 
        });
      } catch (error) {
        console.error("Error processing follow-up question:", error);
        throw error;
      }
    } else {
      // Initial mindmap creation
      if (!blobUrl) {
        return NextResponse.json(
          { error: "PDF blob URL is required" },
          { status: 400 }
        );
      }

      console.log(`Processing PDF from blob URL: ${blobUrl.substring(0, 50)}...`);

      try {
        // Fetch the PDF directly from the blob URL
        const response = await fetch(blobUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }
        
        // Get the PDF data as bytes
        const pdfData = await response.arrayBuffer();
        const pdfBytes = new Uint8Array(pdfData);
        
        console.log(`Successfully fetched PDF, size: ${pdfBytes.length} bytes`);
        
        // Get approximate page count from PDF
        let estimatedPageCount = 20; // Default fallback
        try {
          // This is a simplified approach to estimate page count
          const pdfText = new TextDecoder().decode(pdfData);
          const pageMarkers = pdfText.match(/\/Page\s*<<|\/Type\s*\/Page/g);
          if (pageMarkers && pageMarkers.length > 0) {
            estimatedPageCount = pageMarkers.length;
          }
        } catch (e) {
          console.warn("Could not estimate PDF page count:", e);
        }
        
        // Initialize Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        });

        // Send message with the PDF file
        const response_ = await model.generateContent([
          MINDMAP_CREATION_PROMPT,
          {
            inlineData: {
              mimeType: "application/pdf",
              data: Buffer.from(pdfBytes).toString('base64')
            }
          },
          `File name: ${fileName}`
        ]);

        const responseText = response_.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        const mindmap = JSON.parse(jsonMatch[0]);

        // Validate against mindmap response schema
        const validationResult = validateSchema(mindmap, mindmapResponseSchema);
        if (!validationResult.valid) {
          throw new Error(`Invalid mindmap response schema: ${validationResult.errors.join(', ')}`);
        }

        // Create new session
        const newSessionId = Math.random().toString(36).substring(2, 15);
        chatSessions.set(newSessionId, {
          lastAccessed: Date.now(),
          pdfBytes: pdfBytes
        });

        return NextResponse.json({ 
          success: true, 
          mindmap,
          sessionId: newSessionId
        });
      } catch (error) {
        console.error("Error processing PDF:", error);
        throw error;
      }
    }
    
  } catch (error) {
    console.error("Error in API route:", error);
    
    // Extract error message
    let errorMessage = "Unknown error occurred while processing the request";
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}