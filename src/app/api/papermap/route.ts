import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const SYSTEM_PROMPT = `You are a scientific paper explainer. Your task is to create a hierarchical mindmap structure from the paper content. Follow these guidelines strictly:

1. Create a JSON structure representing a mindmap with the following format:
   {
     "nodes": [
       {
         "id": string (unique identifier, e.g., "node1", "node2"),
         "title": string (keyword/concept/chapter/section),
         "description": string (2-3 sentences explaining the content),
         "parentId": string | null (must match another node's id, null only for root),
         "level": number (0 for root, increments for each child level)
       }
     ]
   }

2. Structure Requirements:
   - EXACTLY ONE root node with level=0 and parentId=null
   - Every non-root node MUST have a parentId that matches an existing node's id
   - Child nodes MUST have level = parent's level + 1
   - IDs must be unique and follow format "node1", "node2", etc.

3. Content Organization:
   - Root node: Paper's main title/topic
   - Level 1: Major sections (Introduction, Methods, Results, etc.)
   - Level 2: Key concepts/findings within each section
   - Level 3: Detailed points/sub-concepts

4. Example Structure:
   {
     "nodes": [
       {"id": "node1", "title": "Paper Title", "description": "Main topic", "parentId": null, "level": 0},
       {"id": "node2", "title": "Methods", "description": "Method details", "parentId": "node1", "level": 1},
       {"id": "node3", "title": "Results", "description": "Key findings", "parentId": "node1", "level": 1},
       {"id": "node4", "title": "Method Detail", "description": "Specific method", "parentId": "node2", "level": 2}
     ]
   }

5. Keep descriptions concise but informative
6. Maximum 3 levels of depth (0, 1, 2) for better visualization
7. Ensure each parent-child relationship is meaningful and logical`;

const generationConfig = {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
});

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

        if (node.level < 0 || node.level > 2) {
            throw new Error(`Invalid level: ${node.level} must be between 0 and 2`);
        }
    });

    return data;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return new Response(JSON.stringify({ error: 'PDF file is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const fileData = await file.arrayBuffer();
        
        const chat = model.startChat({
            generationConfig,
            history: []
        });

        const response = await chat.sendMessage([
            {
                inlineData: {
                    mimeType: "application/pdf",
                    data: Buffer.from(fileData).toString('base64')
                }
            },
            "Analyze this scientific paper and create a mindmap structure. Follow the structure requirements exactly and provide the result in JSON format as specified. Ensure all parent-child relationships are valid."
        ]);

        const result = await response.response.text();
        const cleanedResult = result.replace(/^```json\n|\n```$/g, '').trim();
        const parsedResult = JSON.parse(cleanedResult);
        
        // Validate the structure before returning
        const validatedResult = validateMindmapStructure(parsedResult);

        return new Response(JSON.stringify(validatedResult), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Internal server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
} 