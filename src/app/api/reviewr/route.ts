import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature: 0.3, // Lower temperature for more consistent evaluation
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 4096,
  },
});

const responseSchema = {
  type: 'object',
  properties: {
    overallScore: {
      type: 'number',
      minimum: 0,
      maximum: 100
    },
    overallFeedback: {
      type: 'string'
    },
    comments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          selectedText: { type: 'string' },
          comment: { type: 'string' },
          category: { 
            type: 'string',
            enum: ['grammar', 'structure', 'content', 'clarity', 'argument', 'evidence', 'style', 'mechanics']
          },
          severity: {
            type: 'string',
            enum: ['minor', 'moderate', 'major']
          }
        },
        required: ['selectedText', 'comment', 'category', 'severity'],
        propertyOrdering: ['selectedText', 'comment', 'category', 'severity']
      },
      minItems: 0,
      maxItems: 20
    }
  },
  required: ['overallScore', 'overallFeedback', 'comments'],
  propertyOrdering: ['overallScore', 'overallFeedback', 'comments']
};

// JSON repair function
function repairJSON(jsonString: string): string {
  return jsonString
    // Remove any text before the first {
    .replace(/^[^{]*/, '')
    // Remove any text after the last }
    .replace(/[^}]*$/, '')
    // Fix common JSON issues
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Add quotes to unquoted keys
    .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
    .replace(/\n/g, ' ') // Replace newlines
    .replace(/\r/g, '') // Remove carriage returns
    .replace(/\t/g, ' ') // Replace tabs
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { essayContent, essayType = 'scholarship', rubric } = body || {};

    if (!essayContent || typeof essayContent !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid "essayContent"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!rubric || typeof rubric !== 'object') {
      return new Response(JSON.stringify({ error: 'Missing or invalid "rubric"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Format the rubric for the prompt
    const criteriaText = rubric.criteria.map((criterion: any) => 
      `**${criterion.name} (${criterion.weight}%)**\n${criterion.description}\n${criterion.points.map((point: string) => `- ${point}`).join('\n')}`
    ).join('\n\n')

    const config = {
      criteria: `**${rubric.title.toUpperCase()}**\n\n${criteriaText}`,
      focusAreas: rubric.focusAreas
    }

    const systemInstruction = `You are an expert essay evaluator and writing instructor. Your task is to provide constructive, detailed feedback on essays using established academic criteria.

EVALUATION APPROACH:
1. Read the entire essay carefully
2. Evaluate against the provided rubric
3. Identify specific text passages that need improvement
4. Provide actionable, constructive feedback
5. Balance criticism with encouragement

COMMENTING GUIDELINES:
- Select specific phrases, sentences, or short passages (5-50 words) for targeted feedback
- Provide clear, actionable suggestions for improvement
- Be constructive and encouraging while maintaining academic rigor
- Focus on the most impactful improvements first
- Use professional, supportive language`;

    const userPrompt = `Please evaluate the following ${essayType} essay using this rubric:

${config.criteria}

**KEY FOCUS AREAS:**
${config.focusAreas.map((area: string) => `- ${area}`).join('\n')}

**ESSAY TO EVALUATE:**
${essayContent}

**INSTRUCTIONS:**
1. Provide an overall score (0-100) and general feedback
2. Select specific text passages that need improvement and provide targeted comments
3. Categorize each comment by type (grammar, structure, content, clarity, argument, evidence, style, mechanics)
4. Rate severity as minor, moderate, or major
5. Limit to the most important 10-15 comments for clarity
6. Be constructive and specific in your feedback

Focus on actionable improvements that will have the most impact on the essay's effectiveness.`;

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: systemInstruction + '\n\nIMPORTANT: Return ONLY valid JSON. No additional text before or after the JSON object.' }] },
        { role: 'user', parts: [{ text: userPrompt + '\n\nResponse format: Return ONLY a valid JSON object matching the schema. Do not include any explanatory text.' }] }
      ],
      generationConfig: {
        temperature: 0.2, // Lower temperature for more consistent JSON
        topP: 0.8,
        topK: 20,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any
      }
    });

    const responseText = result.response.text().trim();

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Initial JSON parse failed:', parseError);
      console.log('Raw response text:', responseText);
      
      // Try to repair and parse JSON
      try {
        const repairedJson = repairJSON(responseText);
        console.log('Attempting to parse repaired JSON:', repairedJson.substring(0, 200) + '...');
        parsed = JSON.parse(repairedJson);
      } catch (repairError) {
        console.error('JSON repair failed:', repairError);
        
        // Final fallback: try to extract just the JSON object
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const repairedMatch = repairJSON(jsonMatch[0]);
            parsed = JSON.parse(repairedMatch);
          } catch (finalError) {
            console.error('Final JSON parse failed:', finalError);
            console.log('Final attempt JSON:', jsonMatch[0].substring(0, 200) + '...');
            
            // Return a fallback response
            return new Response(JSON.stringify({
              overallScore: 75,
              overallFeedback: "The AI review system encountered a parsing error. Please try again or add manual comments.",
              comments: []
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } else {
          console.error('No JSON found in response');
          return new Response(JSON.stringify({
            overallScore: 75,
            overallFeedback: "The AI review system is currently unavailable. Please try again later or add manual comments.",
            comments: []
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Validate and sanitize the response
    if (!parsed || typeof parsed !== 'object') {
      return new Response(JSON.stringify({
        overallScore: 75,
        overallFeedback: "The AI review system returned an invalid response. Please try again.",
        comments: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure required fields exist with defaults
    const sanitizedResponse = {
      overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : 75,
      overallFeedback: typeof parsed.overallFeedback === 'string' ? parsed.overallFeedback : 'AI review completed.',
      comments: Array.isArray(parsed.comments) ? parsed.comments.filter((comment: any) => 
        comment && 
        typeof comment.selectedText === 'string' && 
        typeof comment.comment === 'string' &&
        comment.selectedText.length > 0 &&
        comment.comment.length > 0
      ) : []
    };

    return new Response(JSON.stringify(sanitizedResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in /api/reviewr:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
