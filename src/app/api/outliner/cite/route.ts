import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-lite',
  generationConfig: {
    temperature: 0.3,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1024,
  },
});

// Semantic Scholar API base URL
const SEMANTIC_SCHOLAR_API = 'https://api.semanticscholar.org/graph/v1';

interface CitationRequest {
  text: string;
  maxResults?: number;
}

interface KeywordExtractionResponse {
  keywords: string[];
  searchQuery: string;
}

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract: string;
  year?: number;
  authors: Array<{
    name: string;
    authorId?: string;
  }>;
  url: string;
  venue?: string;
  citationCount?: number;
  openAccessPdf?: {
    url: string;
  };
}

interface CitationResponse {
  keywords: string[];
  searchQuery: string;
  papers: SemanticScholarPaper[];
  totalFound: number;
}

async function extractKeywordsFromText(text: string): Promise<KeywordExtractionResponse> {
  const prompt = `Extract 3-5 most relevant academic keywords from the following text that would be useful for finding related research papers. 
  
Text: "${text}"

Return only a JSON object with this exact structure:
{
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "searchQuery": "keyword1 AND keyword2 AND keyword3"
}

Focus on technical terms, concepts, methodologies, and domain-specific vocabulary. Avoid generic words.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      }
    });

    const responseText = result.response.text().trim();
    
    // Try to parse the response
    let parsed: KeywordExtractionResponse;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Fallback: try to extract JSON from the response
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Failed to parse keyword extraction response');
      }
    }

    if (!parsed.keywords || !parsed.searchQuery) {
      throw new Error('Invalid keyword extraction response structure');
    }

    return parsed;
  } catch (error) {
    console.error('Error extracting keywords:', error);
    // Fallback: create basic keywords from the text
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 3);
    
    return {
      keywords: words,
      searchQuery: words.join(' AND ')
    };
  }
}

async function searchSemanticScholar(query: string, maxResults: number = 10): Promise<SemanticScholarPaper[]> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const searchUrl = `${SEMANTIC_SCHOLAR_API}/paper/search`;
            const params = new URLSearchParams({
                query: query,
                limit: maxResults.toString(),
                fields: 'paperId,title,abstract,year,authors,url,venue,citationCount,openAccessPdf'
            });

            const response = await fetch(`${searchUrl}?${params}`, {
                headers: {
                    'User-Agent': 'alhrkn-outliner/1.0 (https://github.com/your-repo)'
                }
            });

            if (response.status === 429) {
                // Rate limited - wait and retry with exponential backoff
                if (attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt - 1);
                    console.log(`Rate limited (429), retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                } else {
                    console.warn('Max retries reached for rate limiting');
                    return [];
                }
            }

            if (!response.ok) {
                throw new Error(`Semantic Scholar API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Handle different response formats from Semantic Scholar
            if (data.data && Array.isArray(data.data)) {
                return data.data;
            } else if (Array.isArray(data)) {
                return data;
            } else {
                console.warn('Unexpected Semantic Scholar response format:', data);
                return [];
            }
        } catch (error) {
            if (attempt === maxRetries) {
                console.error('Error searching Semantic Scholar after all retries:', error);
                return [];
            }
            // Wait before retrying other errors
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Error on attempt ${attempt}, retrying in ${delay}ms:`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    return [];
}

export async function POST(req: NextRequest) {
  try {
    const body: CitationRequest = await req.json();
    const { text, maxResults = 10 } = body;

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Missing or invalid "text" parameter' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (text.trim().length < 10) {
      return new Response(JSON.stringify({ 
        error: 'Text must be at least 10 characters long' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract keywords using Gemini
    const keywordData = await extractKeywordsFromText(text);
    
    // Add a small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Search for papers using the extracted keywords
    const papers = await searchSemanticScholar(keywordData.searchQuery, maxResults);

    // Check if we got rate limited or no results
    if (papers.length === 0) {
      const warningMessage = 'No papers found. This may be due to rate limiting from Semantic Scholar API or no relevant papers available. Please try again in a few moments or select different text.';
      
      return new Response(JSON.stringify({
        keywords: keywordData.keywords,
        searchQuery: keywordData.searchQuery,
        papers: [],
        totalFound: 0,
        warning: warningMessage
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response: CitationResponse = {
      keywords: keywordData.keywords,
      searchQuery: keywordData.searchQuery,
      papers: papers,
      totalFound: papers.length
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in /api/outliner/cite:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
