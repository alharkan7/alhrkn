import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { NextRequest, NextResponse } from 'next/server';
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
    const { blobUrl, fileName, isFollowUp, question, nodeContext, chatHistory } = data;

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
      // Initial mindmap creation
      if (!blobUrl) {
        return NextResponse.json(
          { error: "PDF blob URL is required" },
          { status: 400 }
        );
      }

      console.log(`Processing PDF from blob URL: ${blobUrl.substring(0, 50)}...`);

      try {
        // Download PDF from blob URL
        const pdfResponse = await fetch(blobUrl);
        if (!pdfResponse.ok) {
          throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
        }
        
        // Get the PDF as base64
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const base64Data = Buffer.from(pdfBuffer).toString('base64');
        
        // For initial PDF request, include the PDF data
        messageParts = [
          { text: "Please analyze this PDF and create a structured mindmap following the format specified earlier." },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data
            }
          }
        ];
      } catch (error) {
        console.error("Error downloading PDF from blob URL:", error);
        return NextResponse.json(
          { error: "Failed to download PDF from provided URL" },
          { status: 500 }
        );
      }
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
      chatHistory: newChatHistory
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