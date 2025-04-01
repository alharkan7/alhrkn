import { NextRequest, NextResponse } from 'next/server';
import { 
  GoogleGenerativeAI, 
  HarmCategory, 
  HarmBlockThreshold, 
  GenerationConfig,
  Schema,
  SchemaType
} from '@google/generative-ai';

// Define constants
const MAX_RETRIES = 3; // Maximum number of retries for API calls

// Set up Gemini model configuration - Initial mindmap creation prompt
const MINDMAP_CREATION_PROMPT = `You are a leading expert in the field analyzing this research paper. Present your direct analysis of the content without referring to "the authors" or "the paper." Explain concepts and findings as if you're teaching a colleague. Follow these guidelines strictly:

1. Create a JSON structure representing a mindmap with the following format:
   {
     "nodes": [
       {
         "id": "string",
         "title": "string",
         "description": "string (direct explanation of the content using markdown formatting)",
         "parentId": "string or null",
         "level": "integer",
         "pageNumber": "integer or null (the page number in the PDF where this content appears)"
       }
     ]
   }

2. Structure Requirements:
   - EXACTLY ONE root node with level=0 and parentId=null
   - Every non-root node MUST have a parentId that matches an existing node's id
   - Child nodes MUST have level = parent's level + 1
   - IDs must be unique and follow format "node1", "node2", etc.

3. PAGE NUMBER REQUIREMENT (VERY IMPORTANT):
   - EVERY node MUST include a "pageNumber" field
   - Record the exact page number in the PDF where each piece of content is found
   - Root node should typically use page number 1 (title/abstract page)
   - For precise page identification, observe PDF page numbers, section headers, or figure/table numbers
   - If a concept spans multiple pages, use the page where the concept is first introduced
   - Do not leave pageNumber as null except as a last resort

4. Content Guidelines:
   - Root node: Direct statement of the breakthrough/finding and its significance
   - Level 1: Core findings and implications, stated directly
   - Level 2: Direct explanation of methodologies and results
   - Level 3+: Specific technical details and their implications

5. Description Style Requirements:
   - Use direct statements: "This experiment proves..." instead of "The authors show..."
   - Present findings as facts: "The quantum tunneling effect occurs at 4.2K" instead of "The paper discusses..."
   - Include specific numbers, measurements, and results
   - Explain causality and implications directly
   - Connect findings to the field's broader context
   - USE MARKDOWN FORMATTING in descriptions for better readability:
     * Use **bold** for key findings and important terms
     * Use *italics* for emphasis
     * Use bullet points for lists of related points
     * Use numbered lists for sequential information
     * Use \`code blocks\` for mathematical equations or formulas
     * Use > blockquotes for direct definitions or key statements
     * Include tables using markdown table syntax where appropriate for comparing data
     * Use markdown headings sparingly and only when needed to organize very long descriptions

6. Example Structure:
   {
     "nodes": [
       {"id": "node1", "title": "Quantum Tunneling Breakthrough", "description": "A new quantum tunneling mechanism emerges at **4.2K** in copper-based superconductors, contradicting the established 10K threshold. This resolves the long-standing paradox in low-temperature quantum transport.\n\n> The tunneling effect operates outside conventional theoretical boundaries.\n\nThe mathematical model is described by: \`E = hf - Φ\`, where:\n- E is the electron energy\n- h is Planck's constant\n- f is frequency\n- Φ is the work function", "parentId": null, "level": 0, "pageNumber": 1},
       {"id": "node2", "title": "Novel Transport Mechanism", "description": "The Cooper pairs exhibit coherent tunneling through **15nm barriers**, creating a sustained current of 3.7μA. This tunneling distance exceeds previous limits by 300%, fundamentally changing our understanding of macroscopic quantum phenomena.\n\n*Key findings:*\n1. Tunneling occurs across previously impossible distances\n2. Current remains stable at multiple temperature points\n3. Effect is reproducible in various copper-oxide materials", "parentId": "node1", "level": 1, "pageNumber": 3}
     ]
   }

7. Key Writing Principles:
   - Write as if you're directly explaining the science
   - State findings and implications definitively
   - Focus on what IS rather than what was studied
   - Emphasize concrete results and their meaning
   - Connect each point to fundamental scientific principles
   - Use the language of the paper. For example, if the paper is in German, not in English, provide your response in German.

8. ONLY GIVE THE JSON STRUCTURE. Do not include any additional text or context.`;

// System prompt specifically for answering follow-up questions about a node
const FOLLOWUP_PROMPT = `You are a leading expert in the field analyzing this research paper. A user is asking a follow-up question about a specific concept or finding in the paper. Answer the question directly and factually based on the paper's content. Follow these guidelines strictly:

1. Answer the question directly without referring to "the authors" or "the paper."
2. Base your answer only on information from the paper.
3. If the question cannot be answered based on the paper, say so directly.
4. Be specific and include relevant technical details, data, and numbers from the paper.
5. Explain complex concepts in a clear, concise manner.
6. DO NOT make up information not present in the paper.
7. Your response will be used directly in a markdown renderer, so use proper markdown formatting:
   - Use **bold** for key findings and important terms
   - Use *italics* for emphasis
   - Use bullet points for lists of related points
   - Use numbered lists for sequential information
   - Use \`code blocks\` for mathematical equations or formulas
   - Use > blockquotes for direct definitions or key statements
   - Include tables using markdown syntax where appropriate for comparing data
   - Use markdown headings sparingly and only when needed to organize very long answers`;

// Define the schema using the proper Schema structure
const nodeSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        id: {
            type: SchemaType.STRING
        },
        title: {
            type: SchemaType.STRING
        },
        description: {
            type: SchemaType.STRING
        },
        parentId: {
            type: SchemaType.STRING,
            nullable: true
        },
        level: {
            type: SchemaType.INTEGER
        },
        pageNumber: {
            type: SchemaType.INTEGER,
            nullable: true
        }
    },
    required: ["id", "title", "description", "level"]
};

const responseSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        nodes: {
            type: SchemaType.ARRAY,
            items: nodeSchema
        }
    },
    required: ["nodes"]
};

// Schema for follow-up question answers
const followUpSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        answer: {
            type: SchemaType.STRING,
            description: "A detailed answer to the follow-up question formatted in markdown. This will be rendered directly without further processing."
        }
    },
    required: ["answer"]
};

// Validate mindmap structure
function validateMindmapStructure(data: any) {
    if (!Array.isArray(data.nodes)) {
        throw new Error('Invalid mindmap structure: nodes must be an array');
    }

    // Find root node
    const rootNodes = data.nodes.filter((node: any) => node.level === 0 && node.parentId === null);
    if (rootNodes.length !== 1) {
        throw new Error('Invalid mindmap structure: must have exactly one root node');
    }

    // Create a map of all node IDs
    const nodeIds = new Set(data.nodes.map((node: any) => node.id));

    // Validate each node
    data.nodes.forEach((node: any) => {
        if (!node.id || !node.title || typeof node.level !== 'number') {
            throw new Error('Invalid node structure: missing required fields');
        }

        if (node.parentId && !nodeIds.has(node.parentId)) {
            throw new Error(`Invalid parent ID: ${node.parentId} does not exist`);
        }

        if (node.level < 0) {
            throw new Error(`Invalid level: ${node.level} must be 0 or greater`);
        }
        
        if (node.pageNumber && (typeof node.pageNumber !== 'number' || node.pageNumber < 1)) {
            throw new Error(`Invalid page number: ${node.pageNumber} must be a positive number`);
        }
    });

    return data;
}

// Add page numbers to nodes that don't have them
function assignPageNumbers(data: any, totalPages: number = 20) {
    // Create a map of parent-child relationships
    const childrenMap: Record<string, string[]> = {};
    data.nodes.forEach((node: any) => {
        if (node.parentId) {
            if (!childrenMap[node.parentId]) {
                childrenMap[node.parentId] = [];
            }
            childrenMap[node.parentId].push(node.id);
        }
    });

    // Create a map for node lookups
    const nodeMap: Record<string, any> = {};
    data.nodes.forEach((node: any) => {
        nodeMap[node.id] = node;
    });

    // Find the root node
    const rootNode = data.nodes.find((node: any) => node.level === 0 && node.parentId === null);
    if (!rootNode) return data;

    // Assign page 1 to the root node if it doesn't have a page number
    if (!rootNode.pageNumber) {
        rootNode.pageNumber = 1;
    }

    // Function to get direct children of a node
    const getDirectChildren = (nodeId: string) => {
        return childrenMap[nodeId] || [];
    };

    // Distribute pages among level 1 nodes
    const level1Nodes = data.nodes.filter((node: any) => node.level === 1);
    level1Nodes.forEach((node: any, index: number) => {
        if (!node.pageNumber) {
            // Distribute level 1 nodes across the document
            // Use a formula that distributes page numbers evenly
            const pageStep = Math.max(1, Math.floor(totalPages / (level1Nodes.length + 1)));
            node.pageNumber = Math.min(totalPages, 1 + (index + 1) * pageStep);
        }
    });

    // Process each node level by level
    const processChildren = (parentId: string) => {
        const children = getDirectChildren(parentId);
        if (!children.length) return;

        const parentNode = nodeMap[parentId];
        const parentPage = parentNode.pageNumber || 1;

        // Sort children to ensure reproducible page number assignment
        children.sort();

        // Assign page numbers to children
        children.forEach((childId: string, index: number) => {
            const child = nodeMap[childId];
            if (!child.pageNumber) {
                // Child nodes inherit parent's page with small offset to keep related content together
                // If multiple siblings, spread them slightly to simulate page turns
                const siblingOffset = children.length > 1 ? Math.floor(index / 2) : 0;
                child.pageNumber = Math.min(totalPages, parentPage + siblingOffset);
            }
            
            // Process this node's children
            processChildren(childId);
        });
    };

    // Start processing from the root
    processChildren(rootNode.id);

    return data;
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
    const { blobUrl, fileName, isFollowUp, question, nodeContext } = data;

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

      if (!blobUrl) {
        return NextResponse.json(
          { error: "PDF blob URL is required" },
          { status: 400 }
        );
      }

      console.log(`Processing follow-up question about: ${nodeContext.title}`);
      
      try {
        // Fetch the PDF from the blob URL
        const response = await fetch(blobUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }
        
        // Get the PDF data as bytes
        const pdfData = await response.arrayBuffer();
        const pdfBytes = new Uint8Array(pdfData);
        
        console.log(`Successfully fetched PDF for follow-up, size: ${pdfBytes.length} bytes`);
        
        // Initialize the Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);
        
        // Configure generation parameters for follow-up
        const generationConfig: GenerationConfig = {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: followUpSchema
        };
        
        // Create the model with system instruction for follow-up
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          systemInstruction: FOLLOWUP_PROMPT,
        });
        
        // Start a chat
        const chat = model.startChat({
          generationConfig,
          history: []
        });
        
        // Create the file part
        const filePart = {
          inlineData: {
            mimeType: "application/pdf",
            data: Buffer.from(pdfBytes).toString('base64')
          }
        };

        // Format the node context for the prompt
        const contextPrompt = `I'm analyzing a specific topic from the paper, titled: "${nodeContext.title}"
Here's what I already know about this topic (from the paper):
${nodeContext.description}

My question is: ${question}

Provide a direct, factual answer based on the paper's content, using markdown formatting. Focus only on information from the paper. Return your answer as a JSON object with the answer field containing markdown-formatted text.`;
        
        // Send the message with retries
        let response_;
        let attempts = 0;
        
        while (attempts < MAX_RETRIES) {
          try {
            console.log(`Gemini API follow-up attempt ${attempts + 1} of ${MAX_RETRIES}`);
            
            // Send message with the PDF file and context
            response_ = await chat.sendMessage([
              filePart,
              contextPrompt
            ]);
            
            break; // Exit loop if successful
          } catch (error) {
            attempts++;
            console.error(`Gemini API error (attempt ${attempts}):`, error);
            
            // If we've reached max retries, throw the error
            if (attempts >= MAX_RETRIES) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              throw new Error(`[GoogleGenerativeAI Error] ${errorMessage}`);
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
          }
        }
        
        if (!response_) {
          throw new Error("[GoogleGenerativeAI Error] Failed to get response from Gemini after retries");
        }
        
        // Check if the response contains error information
        if (response_.response.promptFeedback?.blockReason) {
          throw new Error(`[GoogleGenerativeAI Error] Content blocked: ${response_.response.promptFeedback.blockReason}`);
        }
        
        // Get the text response
        const result = await response_.response.text();
        
        // Try to parse the result as JSON with error handling
        let parsedResult;
        try {
          parsedResult = JSON.parse(result);
          
          // Check if the parsed result has the expected structure
          if (!parsedResult.answer) {
            throw new Error('Invalid response format: expected an "answer" field');
          }
        } catch (parseError) {
          console.error('Failed to parse Gemini response as JSON:', {
            error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
            responsePreview: result.substring(0, 200)
          });
          
          // If it's not valid JSON but has content that looks like an answer
          if (result.length > 20 && !result.includes('{') && !result.includes('}')) {
            // Just wrap it in an answer field
            parsedResult = { answer: result };
          } else {
            throw new Error(`Failed to parse Gemini response as JSON. The model may have returned an error or invalid format. ${parseError instanceof Error ? parseError.message : ''}`);
          }
        }
        
        // Return the answer data
        return NextResponse.json({
          success: true,
          isFollowUp: true,
          answer: parsedResult.answer
        });
        
      } catch (error) {
        console.error("Error processing follow-up question:", error);
        throw error;
      }
    } else {
      // Initial mindmap creation - keep existing implementation
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
        
        // Initialize the Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);
        
        // Configure generation parameters
        const generationConfig: GenerationConfig = {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: responseSchema
        };
        
        // Create the model with system instruction
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          systemInstruction: MINDMAP_CREATION_PROMPT,
        });
        
        // Start a chat
        const chat = model.startChat({
          generationConfig,
          history: []
        });
        
        // Create the file part
        const filePart = {
          inlineData: {
            mimeType: "application/pdf",
            data: Buffer.from(pdfBytes).toString('base64')
          }
        };
        
        // Send the message with retries
        let response_;
        let attempts = 0;
        
        while (attempts < MAX_RETRIES) {
          try {
            console.log(`Gemini API attempt ${attempts + 1} of ${MAX_RETRIES}`);
            
            // Send message with the PDF file
            response_ = await chat.sendMessage([
              filePart,
              "Analyze this scientific paper and create a mindmap structure. Follow the structure requirements exactly and provide the result in JSON format as specified. Pay special attention to including accurate page numbers for each node, as this is crucial for the user to navigate the document. Ensure all parent-child relationships are valid."
            ]);
            
            break; // Exit loop if successful
          } catch (error) {
            attempts++;
            console.error(`Gemini API error (attempt ${attempts}):`, error);
            
            // If we've reached max retries, throw the error
            if (attempts >= MAX_RETRIES) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              throw new Error(`[GoogleGenerativeAI Error] ${errorMessage}`);
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
          }
        }
        
        if (!response_) {
          throw new Error("[GoogleGenerativeAI Error] Failed to get response from Gemini after retries");
        }
        
        // Check if the response contains error information
        if (response_.response.promptFeedback?.blockReason) {
          throw new Error(`[GoogleGenerativeAI Error] Content blocked: ${response_.response.promptFeedback.blockReason}`);
        }
        
        // Get the text response
        const result = await response_.response.text();
        
        // Try to parse the result as JSON with error handling
        let parsedResult;
        try {
          parsedResult = JSON.parse(result);
          
          // Check if the parsed result has the expected structure
          if (!parsedResult.nodes || !Array.isArray(parsedResult.nodes)) {
            throw new Error('Invalid response format: expected a "nodes" array');
          }
        } catch (parseError) {
          // Log the problematic response for debugging
          console.error('Failed to parse Gemini response as JSON:', {
            error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
            responsePreview: result.substring(0, 200) // Log first 200 chars of response
          });
          
          throw new Error(`Failed to parse Gemini response as JSON. The model may have returned an error or invalid format. ${parseError instanceof Error ? parseError.message : ''}`);
        }
        
        // Debug: Check if Gemini provided any page numbers
        const nodesWithPageNumbers = parsedResult.nodes.filter((node: any) => node.pageNumber != null);
        console.log(`DEBUG: Gemini provided ${nodesWithPageNumbers.length} out of ${parsedResult.nodes.length} nodes with page numbers`);
        
        // Validate the structure
        const validatedResult = validateMindmapStructure(parsedResult);
        
        // Assign page numbers to nodes that don't have them
        const processedResult = assignPageNumbers(validatedResult, estimatedPageCount);
        
        // Debug: Verify all nodes now have page numbers
        const finalNodesWithPageNumbers = processedResult.nodes.filter((node: any) => node.pageNumber != null);
        console.log(`DEBUG: After processing, ${finalNodesWithPageNumbers.length} out of ${processedResult.nodes.length} nodes have page numbers`);
        
        // Generate a session ID for follow-up questions
        const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
        
        // Return the mindmap data
        return NextResponse.json({
          success: true,
          mindmap: processedResult,
          fileName: fileName || 'document',
          sessionId
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