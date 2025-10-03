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
    temperature: 0.3,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 4096,
  },
});

// Removed complex schema to avoid Gemini constraints

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body || {};

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "text" parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

const systemInstruction = `You are a specialized AI assistant for discourse network analysis. Your task is to identify and extract ONLY direct statements and claims that have CLEAR attribution to specific actors or organizations.

CRITICAL: Only extract statements where you can clearly identify who is making the statement (the actor/organization). If the actor is unknown or unclear, DO NOT include it - it's just narrative/reporting from the author/reporter.

For each statement you identify, provide these components:
- statement: The exact statement or claim being made (the direct quote or attributed claim)
- concept: What the statement is about (in 2-5 words)
- actor: Who is making/giving the statement (person name, role, or entity) - MUST be clearly identified
- organization: The organization/institution associated with the actor (leave empty if none mentioned)
- agree: true if the statement expresses agreement/support/approval, false if it expresses disagreement/criticism/opposition

STRICT GUIDELINES:
1. ONLY extract statements with CLEAR attribution (quotes, "said that", "according to", "stated", "announced", etc.)
2. IGNORE general narrative, descriptions, or facts without clear sourcing
3. IGNORE statements where the actor is "Unknown", "Reporter", "Author", or similar
4. Each statement MUST have a specific, identifiable actor or organization
5. Break down complex attributed statements into multiple entries if they contain multiple claims
6. Focus on direct claims, opinions, positions from specific sources
7. Organization field can be empty, but actor MUST be specific and clear

EXAMPLES:

GOOD - Clear attribution:
Text: "President Biden praised the new climate bill, but Senator Johnson criticized it as too expensive."
→ Extract both statements (clear actors identified)

Text: "According to the EPA report, climate change is accelerating faster than predicted."
→ DO NOT extract (no specific person/actor, just "EPA report" - this is narrative)

Text: "John Smith from Greenpeace said, 'We must protect the Amazon rainforest immediately.'"
→ Extract the statement (clear actor "John Smith" from "Greenpeace")

BAD - No clear actor:
Text: "Climate change is causing more extreme weather events worldwide."
→ DO NOT extract (no actor identified, just general fact/narrative)

Text: "The report shows that temperatures have risen 1.5 degrees."
→ DO NOT extract (no specific actor, just "the report" - narrative)`;

const userPrompt = `Please analyze this text and extract all statements/discourse components:

"${text}"

Return ONLY the JSON structure with the statements array. Do not include any additional text or explanations.`;

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: systemInstruction }] },
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json'
      }
    });

    const responseText = result.response.text().trim();

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON from response if it's wrapped in text
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          return new Response(JSON.stringify({
            error: 'Failed to parse model response as JSON',
            raw: responseText,
            parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else {
        return new Response(JSON.stringify({
          error: 'Failed to parse model response as JSON',
          raw: responseText,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Handle different response formats
    let statementsArray: any[] = [];

    if (Array.isArray(parsed)) {
      // Response is direct array of statements
      statementsArray = parsed;
    } else if (parsed?.statements && Array.isArray(parsed.statements)) {
      // Response is object with statements array
      statementsArray = parsed.statements;
    } else {
      return new Response(JSON.stringify({
        error: 'Model response missing statements array',
        raw: parsed,
        expectedFormat: 'Expected either an array of statements or { statements: [...] }'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate each statement has required fields
    const validatedStatements = statementsArray.filter((stmt: any) => {
      return stmt &&
             typeof stmt.statement === 'string' &&
             typeof stmt.concept === 'string' &&
             typeof stmt.actor === 'string' &&
             typeof stmt.organization === 'string' &&
             typeof stmt.agree === 'boolean';
    });

    if (validatedStatements.length === 0 && statementsArray.length > 0) {
      return new Response(JSON.stringify({
        error: 'No valid statements found in response',
        raw: parsed,
        validationErrors: 'Each statement must have: statement (string), concept (string), actor (string), organization (string), agree (boolean)'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ statements: validatedStatements }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in /api/dnanalyzer:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
