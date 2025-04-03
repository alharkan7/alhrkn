import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Google AI services
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

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
  "answer": "your answer here"
}

USE MARKDOWN FORMATTING in all descriptions and answers to make the text visually more appealing. Use **bold**, *italics*, lists, and other markdown features to improve readability.

The client will use your responses to construct and update a visual mindmap. Ensure all JSON is valid and follows these exact schemas.

GIVE YOUR RESPONSE IN THE MAIN LANGUAGE OF THE FILE. For example, if the PDF is dominantly not in English, provide your response using that language instead of English. If there's no PDF, then give your response in English.`;

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
    const { blobUrl, isFollowUp, question, nodeContext, chatHistory } = data;

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
        { text: `This is a follow-up question about a specific node in the mindmap.\n\nNode Title: ${nodeContext.title}\nNode Description: ${nodeContext.description}\n\nQuestion: ${question}\n\n1. Answer the question directly without referring to "the authors" or "the paper."\n2. Prioritize your answer to be based on information from the paper. If necessary, add information based on your knowledge base.\n3. Be specific and include relevant details, data, and numbers from the paper.\n4. Explain complex concepts in a clear, concise manner.\n5. REMEMBER: GIVE YOUR RESPONSE IN THE DOMINANT LANGUAGE OF THE FILE, even though the question is in English.\n6. Provide an answer that fully addresses the question.\n7. USE MARKDOWN FORMATTING in your answer to make it more visually appealing with **bold**, *italics*, bullet points, and other formatting features as appropriate.\n7. DO NOT reference the node, just answer the question.\n\nPlease provide answer in the format: { "answer": "your answer here" }` }
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
        // OPTIMIZATION: For Vercel Blob URLs, use the remote file capability of Gemini API
        // instead of downloading the content and re-uploading it
        
        // Check if it's a Vercel Blob URL or other URL
        const isVercelBlobUrl = blobUrl.includes('vercel-blob.com');
        
        if (isVercelBlobUrl) {
          // Use the remote file reference capability of Gemini API
          // This avoids downloading and re-uploading the PDF
          messageParts = [
            { text: "Please analyze this PDF and create a structured mindmap following the format specified earlier.\n\nStructure Requirements:\n   - EXACTLY ONE root node with level=0 and parentId=null\n   - Every non-root node MUST have a parentId that matches an existing node's id\n   - Child nodes MUST have level = parent's level + 1\n   - IDs must be unique\n\nPAGE NUMBER REQUIREMENT (VERY IMPORTANT):\n   - EVERY node MUST include a \"pageNumber\" field\n   - Record the exact page number in the PDF where each piece of content is found\n   - Root node should typically use page number 1 (title/abstract page)\n   - For precise page identification, observe PDF page numbers, section headers, or figure/table numbers\n   - If a concept spans multiple pages, use the page where the concept is first introduced\n   - Do not leave pageNumber as null except as a last resort\n\nDescription Style Requirements:\n   - Use direct statements: \"This experiment proves...\" instead of \"The authors show...\"\n   - Present findings as facts: \"The quantum tunneling effect occurs at 4.2K\" instead of \"The paper discusses...\"\n   - Include specific numbers, measurements, and results\n   - Explain causality and implications directly\n   - Connect findings to the field's broader context\n   - USE MARKDOWN FORMATTING in descriptions to make them more visually appealing (bold, italics, bullet points, etc.)\n\nExample Structure:\n   {\n     \"nodes\": [\n       {\"id\": \"node1\", \"title\": \"Quantum Tunneling Breakthrough\", \"description\": \"**A new quantum tunneling mechanism** emerges at *4.2K* in copper-based superconductors, contradicting the established 10K threshold. This resolves the long-standing paradox in low-temperature quantum transport.\", \"parentId\": null, \"level\": 0, \"pageNumber\": 1},\n       {\"id\": \"node2\", \"title\": \"Novel Transport Mechanism\", \"description\": \"The Cooper pairs exhibit coherent tunneling through *15nm barriers*, creating a sustained current of **3.7μA**. This tunneling distance exceeds previous limits by 300%, fundamentally changing our understanding of macroscopic quantum phenomena.\", \"parentId\": \"node1\", \"level\": 1, \"pageNumber\": 3}\n     ]\n   }\n\nKey Writing Principles:\n   - Write as if you're directly explaining the science\n   - State findings and implications definitively\n   - Focus on what IS rather than what was studied\n   - Emphasize concrete results and their meaning\n   - Connect each point to fundamental scientific principles\n\nONLY GIVE THE JSON STRUCTURE. Do not include any additional text or context." },
            {
              fileData: {
                mimeType: "application/pdf",
                fileUri: blobUrl
              }
            }
          ];
        } else {
          // For non-Vercel Blob URLs, fall back to the download method
          const pdfResponse = await fetch(blobUrl);
          if (!pdfResponse.ok) {
            throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
          }
          
          // Get the PDF as base64
          const pdfBuffer = await pdfResponse.arrayBuffer();
          const base64Data = Buffer.from(pdfBuffer).toString('base64');
          
          messageParts = [
            { text: "Please analyze this PDF and create a structured mindmap following the format specified earlier.\n\nStructure Requirements:\n   - EXACTLY ONE root node with level=0 and parentId=null\n   - Every non-root node MUST have a parentId that matches an existing node's id\n   - Child nodes MUST have level = parent's level + 1\n   - IDs must be unique\n\nPAGE NUMBER REQUIREMENT (VERY IMPORTANT):\n   - EVERY node MUST include a \"pageNumber\" field\n   - Record the exact page number in the PDF where each piece of content is found\n   - Root node should typically use page number 1 (title/abstract page)\n   - For precise page identification, observe PDF page numbers, section headers, or figure/table numbers\n   - If a concept spans multiple pages, use the page where the concept is first introduced\n   - Do not leave pageNumber as null except as a last resort\n\nDescription Style Requirements:\n   - Use direct statements: \"This experiment proves...\" instead of \"The authors show...\"\n   - Present findings as facts: \"The quantum tunneling effect occurs at 4.2K\" instead of \"The paper discusses...\"\n   - Include specific numbers, measurements, and results\n   - Explain causality and implications directly\n   - Connect findings to the field's broader context\n   - USE MARKDOWN FORMATTING in descriptions to make them more visually appealing (bold, italics, bullet points, etc.)\n\nExample Structure:\n   {\n     \"nodes\": [\n       {\"id\": \"node1\", \"title\": \"Quantum Tunneling Breakthrough\", \"description\": \"**A new quantum tunneling mechanism** emerges at *4.2K* in copper-based superconductors, contradicting the established 10K threshold. This resolves the long-standing paradox in low-temperature quantum transport.\", \"parentId\": null, \"level\": 0, \"pageNumber\": 1},\n       {\"id\": \"node2\", \"title\": \"Novel Transport Mechanism\", \"description\": \"The Cooper pairs exhibit coherent tunneling through *15nm barriers*, creating a sustained current of **3.7μA**. This tunneling distance exceeds previous limits by 300%, fundamentally changing our understanding of macroscopic quantum phenomena.\", \"parentId\": \"node1\", \"level\": 1, \"pageNumber\": 3}\n     ]\n   }\n\nKey Writing Principles:\n   - Write as if you're directly explaining the science\n   - State findings and implications definitively\n   - Focus on what IS rather than what was studied\n   - Emphasize concrete results and their meaning\n   - Connect each point to fundamental scientific principles\n\nONLY GIVE THE JSON STRUCTURE. Do not include any additional text or context." },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data
              }
            }
          ];
        }
      } catch (error) {
        console.error("Error processing PDF from blob URL:", error);
        return NextResponse.json(
          { error: "Failed to process PDF from provided URL" },
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
    
    // Ensure the answer is consistently formatted for follow-up questions
    let formattedAnswer;
    if (isFollowUp) {
      if (typeof responseData.answer === 'string') {
        formattedAnswer = responseData.answer;
      } else if (responseData.answer) {
        // If it's not a string but exists, stringify it
        formattedAnswer = JSON.stringify(responseData.answer);
      } else {
        // If there's no answer field, use the whole response
        formattedAnswer = JSON.stringify(responseData);
      }
    }
    
    const responseObject = {
      success: true,
      ...(isFollowUp ? { answer: formattedAnswer } : { mindmap: responseData }),
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