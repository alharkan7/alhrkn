import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// Initialize Google AI services
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

// Define system prompt that explains the response format requirements
const SYSTEM_PROMPT = `You are a specialized AI assistant that analyzes PDF documents and creates structured mindmaps.

For the FIRST message with a PDF, you will create a mindmap with this structure:
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
}

For FOLLOW-UP questions about specific nodes, you will provide answers in this format:
{
  "answer": "your detailed answer here"
}

The client will use your responses to construct and update a visual mindmap. Ensure all JSON is valid and follows these exact schemas.`;

/**
 * Helper function to upload a file to Google AI File Manager
 */
async function uploadPdfToFileManager(pdfBuffer: Buffer, fileName: string): Promise<string> {
  try {
    // Create temporary file
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'papermap-'));
    const tempFilePath = path.join(tempDir, `${crypto.randomUUID()}.pdf`);
    
    // Write buffer to temporary file
    await fs.writeFile(tempFilePath, pdfBuffer);
    
    // Upload to Google AI File Manager
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType: 'application/pdf',
      displayName: fileName || 'document.pdf'
    });
    
    // Clean up temporary file
    try {
      await fs.unlink(tempFilePath);
      await fs.rmdir(tempDir);
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary files:', cleanupError);
    }
    
    return uploadResult.file.uri;
  } catch (error) {
    console.error('Error uploading to File Manager:', error);
    throw new Error('Failed to upload PDF to AI service');
  }
}

/**
 * Main API route for handling PDF analysis and follow-up questions
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
    const { 
      blobUrl, 
      pdfFile, 
      pdfBase64, 
      fileName, 
      fileUri, 
      isFollowUp, 
      question, 
      nodeContext, 
      chatHistory 
    } = data;

    // Initialize Gemini API with appropriate configuration
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
    
    // Start a chat with the system prompt
    let chat;
    
    if (chatHistory && chatHistory.length > 0) {
      // If we have chat history, use it
      const formattedHistory = chatHistory.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      }));
      
      chat = model.startChat({
        history: formattedHistory,
        generationConfig: {
          responseMimeType: "application/json"
        }
      });
    } else {
      // If no history, start with the system prompt
      chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: SYSTEM_PROMPT }]
          },
          {
            role: "model",
            parts: [{ text: "I understand. I'll analyze PDFs and create structured mindmaps for first requests, and provide focused answers for follow-up questions. All responses will follow the exact JSON schemas you specified." }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      });
    }
    
    // Prepare message parts based on whether this is initial request or follow-up
    let messageParts = [];
    
    if (isFollowUp) {
      // For follow-up questions, include the node context and question
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

      messageParts = [
        { text: `This is a follow-up question about a specific node in the mindmap.\n\nNode Title: ${nodeContext.title}\nNode Description: ${nodeContext.description}\n\nQuestion: ${question}\n\nPlease provide a detailed answer in the format: { "answer": "your detailed answer here" }` }
      ];
      
    } else {
      // Initial mindmap creation requires a PDF
      let pdfUri: string | undefined;
      
      // First check if we already have a Google AI fileUri
      if (fileUri) {
        pdfUri = fileUri;
        console.log("Using provided Google AI File URI:", fileUri);
      } 
      // If we have base64 PDF data
      else if (pdfBase64) {
        try {
          const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
          const pdfBuffer = Buffer.from(base64Data, 'base64');
          pdfUri = await uploadPdfToFileManager(pdfBuffer, fileName || 'uploaded-document.pdf');
          console.log("PDF uploaded to Google AI from base64 data");
        } catch (error) {
          console.error("Error uploading base64 PDF to Google AI:", error);
          return NextResponse.json(
            { error: "Failed to process PDF data" },
            { status: 500 }
          );
        }
      } 
      // If we have a blob URL (Vercel Blob or other URL)
      else if (blobUrl) {
        try {
          console.log(`Processing PDF from URL: ${blobUrl.substring(0, 50)}...`);
          // Download PDF from blob URL
          const pdfResponse = await fetch(blobUrl);
          if (!pdfResponse.ok) {
            throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
          }
          
          // Get the PDF as buffer
          const pdfBuffer = await pdfResponse.arrayBuffer();
          
          // Upload to Google AI File Manager
          pdfUri = await uploadPdfToFileManager(
            Buffer.from(pdfBuffer), 
            fileName || 'document-from-url.pdf'
          );
          console.log("PDF uploaded to Google AI from URL");
        } catch (error) {
          console.error("Error downloading and uploading PDF from URL:", error);
          return NextResponse.json(
            { error: "Failed to download PDF from provided URL" },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "PDF data is required (fileUri, pdfBase64, or blobUrl)" },
          { status: 400 }
        );
      }

      // Double check that we have a valid fileUri
      if (!pdfUri) {
        return NextResponse.json(
          { error: "Failed to process PDF: No valid file reference obtained" },
          { status: 500 }
        );
      }

      // For initial PDF request, include the PDF file reference
      messageParts = [
        { text: "Please analyze this PDF and create a structured mindmap following the format specified earlier." },
        {
          fileData: {
            mimeType: "application/pdf",
            fileUri: pdfUri  // This is now guaranteed to be a string
          }
        }
      ];
    }
    
    // Send the message and get response
    const response = await chat.sendMessage(messageParts);
    const responseText = response.response.text();
    
    // Extract the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    const responseData = JSON.parse(jsonMatch[0]);
    
    // Create the response data
    const newChatHistory = [
      ...(chatHistory || []),
      {
        role: "user",
        content: isFollowUp 
          ? `Follow-up question about ${nodeContext.title}: ${question}` 
          : "Please create a mindmap from this PDF"
      },
      {
        role: "model",
        content: responseText
      }
    ];
    
    const responseObject = {
      success: true,
      ...(isFollowUp ? { answer: responseData.answer } : { mindmap: responseData }),
      chatHistory: newChatHistory,
      // Include the fileUri in the response for future use
      fileUri: messageParts[1]?.fileData?.fileUri
    };
    
    return NextResponse.json(responseObject);
    
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