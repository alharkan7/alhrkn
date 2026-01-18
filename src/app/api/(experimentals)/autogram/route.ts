import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

// Use Gemini 2.5 Flash model as requested
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
    },
});

const SYSTEM_PROMPT = `You are an expert at transforming text into structured data for creating Smart Art-like diagrams. Your task is to analyze input text and convert it into a hierarchical diagram structure that can be rendered as a Smart Art diagram.

When processing text, identify:
1. Main concepts and themes
2. Key processes or steps
3. Relationships between different elements
4. Hierarchical structure (main topics, subtopics, details)

Return a JSON structure that represents a Smart Art diagram with the following format:

{
  "title": "Main diagram title",
  "type": "process_flow|concept_map|hierarchy|timeline|comparison",
  "nodes": [
    {
      "id": "unique_id",
      "label": "Node text",
      "level": 1,
      "position": {"x": 0, "y": 0},
      "parent": null,
      "children": ["child_id_1", "child_id_2"]
    }
  ],
  "connections": [
    {
      "from": "node_id",
      "to": "node_id",
      "type": "solid|dashed|arrow",
      "label": "connection_label"
    }
  ],
  "layout": {
    "orientation": "horizontal|vertical",
    "alignment": "center|left|right"
  }
}

Guidelines:
- Create meaningful hierarchical relationships
- Use clear, concise labels for nodes
- Position nodes logically based on their relationships
- Choose the most appropriate diagram type for the content
- Include connection labels where they add clarity
- Keep the structure balanced and easy to understand

Analyze the text thoroughly and create a comprehensive diagram structure.`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text } = body;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return new Response(JSON.stringify({
                error: 'Text input is required and must be a non-empty string'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Create the prompt for Gemini
        const userPrompt = `Analyze this text and transform it into a Smart Art diagram structure:

${text}

Please provide a JSON response with the diagram structure that represents the key concepts, processes, and relationships in this text. Focus on creating a clear, hierarchical visualization that captures the main ideas and their connections.`;

        // Generate the diagram structure using Gemini
        const chat = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                {
                    role: 'model',
                    parts: [{ text: 'I understand. I will analyze text and create Smart Art diagram structures in JSON format.' }]
                }
            ]
        });

        const result = await chat.sendMessage(userPrompt);
        const response = await result.response;
        const responseText = response.text();

        // Try to parse the response as JSON
        try {
            // Clean the response text to extract JSON
            let jsonText = responseText.trim();

            // Remove markdown code blocks if present
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            // Parse the JSON
            const diagramData = JSON.parse(jsonText);

            // Validate the structure
            if (!diagramData.nodes || !Array.isArray(diagramData.nodes)) {
                throw new Error('Invalid diagram structure: missing or invalid nodes array');
            }

            return new Response(JSON.stringify(diagramData), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });

        } catch (parseError) {
            console.error('Failed to parse Gemini response as JSON:', parseError);
            console.log('Raw response:', responseText);

            // Return a fallback structure if parsing fails
            const fallbackDiagram = {
                title: "Text Analysis",
                type: "concept_map",
                nodes: [
                    {
                        id: "main",
                        label: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
                        level: 1,
                        position: { x: 0, y: 0 },
                        parent: null,
                        children: []
                    }
                ],
                connections: [],
                layout: {
                    orientation: "vertical",
                    alignment: "center"
                },
                raw_response: responseText // Include the raw response for debugging
            };

            return new Response(JSON.stringify(fallbackDiagram), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

    } catch (error) {
        console.error('Error in autogram API:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
