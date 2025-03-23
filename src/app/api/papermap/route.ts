import { GoogleGenerativeAI, GenerationConfig, Schema, SchemaType } from '@google/generative-ai';
import { NextRequest } from 'next/server';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const SYSTEM_PROMPT = `You are a leading expert in the field analyzing this research paper. Present your direct analysis of the content without referring to "the authors" or "the paper." Explain concepts and findings as if you're teaching a colleague. Follow these guidelines strictly:

1. Create a JSON structure representing a mindmap with the following format:
   {
     "nodes": [
       {
         "id": "string",
         "title": "string",
         "description": "string (direct explanation of the content)",
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

6. Example Structure:
   {
     "nodes": [
       {"id": "node1", "title": "Quantum Tunneling Breakthrough", "description": "A new quantum tunneling mechanism emerges at 4.2K in copper-based superconductors, contradicting the established 10K threshold. This resolves the long-standing paradox in low-temperature quantum transport.", "parentId": null, "level": 0, "pageNumber": 1},
       {"id": "node2", "title": "Novel Transport Mechanism", "description": "The Cooper pairs exhibit coherent tunneling through 15nm barriers, creating a sustained current of 3.7μA. This tunneling distance exceeds previous limits by 300%, fundamentally changing our understanding of macroscopic quantum phenomena.", "parentId": "node1", "level": 1, "pageNumber": 3}
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
    required: ["id", "title", "description", "parentId", "level"]
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

const generationConfig: GenerationConfig = {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: responseSchema
};

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
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
        
        // Get approximate page count from PDF
        let estimatedPageCount = 20; // Default fallback
        try {
            // This is a very simplified approach - in production you'd use a proper PDF parsing library
            // Count newpage markers as a rough approximation
            const pdfText = new TextDecoder().decode(fileData);
            const pageMarkers = pdfText.match(/\/Page\s*<<|\/Type\s*\/Page/g);
            if (pageMarkers && pageMarkers.length > 0) {
                estimatedPageCount = pageMarkers.length;
            }
        } catch (e) {
            console.warn("Could not estimate PDF page count:", e);
        }
        
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
            "Analyze this scientific paper and create a mindmap structure. Follow the structure requirements exactly and provide the result in JSON format as specified. Pay special attention to including accurate page numbers for each node, as this is crucial for the user to navigate the document. Ensure all parent-child relationships are valid."
        ]);

        // With structured output, we can directly use the response object
        const result = await response.response.text();
        const parsedResult = JSON.parse(result);
        
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
        console.log('DEBUG: Sample node with page number:', processedResult.nodes[0]);

        return new Response(JSON.stringify(processedResult), {
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