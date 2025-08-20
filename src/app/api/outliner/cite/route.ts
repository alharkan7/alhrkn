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

// OpenAlex API base URL
const OPENALEX_API = 'https://api.openalex.org';

interface CitationRequest {
  text?: string;
  maxResults?: number; // deprecated
  perPage?: number;
  page?: number;
  searchQuery?: string;
}

interface KeywordExtractionResponse {
  keywords: string[];
  searchQuery: string;
}

interface OpenAlexWork {
  id: string;
  title: string;
  abstract_inverted_index?: Record<string, number[]>;
  publication_year?: number;
  authorships?: Array<{
    author: {
      display_name: string;
      id?: string;
    };
  }>;
  primary_location?: {
    source?: {
      display_name?: string;
    };
    pdf_url?: string;
  };
  locations?: Array<{
    source?: {
      display_name?: string;
    };
    pdf_url?: string;
  }>;
  cited_by_count?: number;
  doi?: string;
  open_access?: {
    is_oa?: boolean;
    oa_url?: string;
  };
}

interface CitationResponse {
  keywords: string[];
  searchQuery: string;
  papers: OpenAlexWork[];
  totalFound: number;
  page: number;
  perPage: number;
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

async function searchOpenAlex(query: string, perPage: number = 10, page: number = 1): Promise<{ results: OpenAlexWork[]; count: number; page: number; perPage: number; }> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const searchUrl = `${OPENALEX_API}/works`;
            const params = new URLSearchParams({
                search: query,
                per_page: perPage.toString(),
                page: page.toString(),
                select: 'id,title,abstract_inverted_index,publication_year,authorships,primary_location,locations,cited_by_count,doi,open_access'
            });

            const response = await fetch(`${searchUrl}?${params}`, {
                headers: {
                    'User-Agent': 'alhrkn-outliner/1.0 (https://github.com/alharkan7/alhrkn)'
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
                    return { results: [], count: 0, page, perPage };
                }
            }

            if (!response.ok) {
                throw new Error(`OpenAlex API error: ${response.status}`);
            }

            const data = await response.json();
            
            // OpenAlex returns results in data.results
            if (data.results && Array.isArray(data.results)) {
                const count = typeof data?.meta?.count === 'number' ? data.meta.count : (data.results?.length || 0);
                return { results: data.results, count, page, perPage };
            } else {
                console.warn('Unexpected OpenAlex response format:', data);
                return { results: [], count: 0, page, perPage };
            }
        } catch (error) {
            if (attempt === maxRetries) {
                console.error('Error searching OpenAlex after all retries:', error);
                return { results: [], count: 0, page, perPage };
            }
            // Wait before retrying other errors
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Error on attempt ${attempt}, retrying in ${delay}ms:`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    return { results: [], count: 0, page, perPage };
}

// Helper function to convert OpenAlex work to the format expected by the frontend
function convertOpenAlexWorkToPaper(work: OpenAlexWork): any {
    // Extract abstract from inverted index if available
    let abstract = '';
    if (work.abstract_inverted_index) {
        const words: string[] = [];
        const maxIndex = Math.max(...Object.values(work.abstract_inverted_index).flat());
        
        for (let i = 0; i <= maxIndex; i++) {
            for (const [word, positions] of Object.entries(work.abstract_inverted_index)) {
                if (positions.includes(i)) {
                    words[i] = word;
                    break;
                }
            }
        }
        abstract = words.filter(Boolean).join(' ');
    }

    // Extract authors
    const authors = work.authorships?.map(authorship => ({
        name: authorship.author.display_name,
        authorId: authorship.author.id
    })) || [];

    // Extract venue from primary location or first location
    let venue = '';
    if (work.primary_location?.source?.display_name) {
        venue = work.primary_location.source.display_name;
    } else if (work.locations?.[0]?.source?.display_name) {
        venue = work.locations[0].source.display_name;
    }

    // Extract PDF URL
    let pdfUrl = '';
    if (work.primary_location?.pdf_url) {
        pdfUrl = work.primary_location.pdf_url;
    } else if (work.locations?.[0]?.pdf_url) {
        pdfUrl = work.locations[0].pdf_url;
    } else if (work.open_access?.oa_url) {
        pdfUrl = work.open_access.oa_url;
    }

    // Create URL from DOI if no direct URL available
    let url = '';
    if (work.doi) {
        url = `${work.doi}`;
    }

    return {
        paperId: work.id,
        title: work.title,
        abstract: abstract,
        year: work.publication_year,
        authors: authors,
        url: url,
        venue: venue,
        citationCount: work.cited_by_count || 0,
        openAccessPdf: pdfUrl ? { url: pdfUrl } : undefined
    };
}

export async function POST(req: NextRequest) {
  try {
    const body: CitationRequest = await req.json();
    const { text, maxResults = 10, perPage: perPageRaw, page: pageRaw, searchQuery } = body;

    const perPage = Math.max(1, Math.min(25, Number(perPageRaw || maxResults || 10)));
    const page = Math.max(1, Number(pageRaw || 1));

    let keywordData: KeywordExtractionResponse;
    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim().length > 0) {
      // Use provided search query; derive keywords heuristically
      const derivedKeywords = searchQuery.split(/\s+AND\s+/i).map(s => s.trim()).filter(Boolean);
      keywordData = { keywords: derivedKeywords, searchQuery };
    } else {
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
      keywordData = await extractKeywordsFromText(text);
    }
    
    // Add a small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Search for papers using the extracted/provided keywords
    const searchResult = await searchOpenAlex(keywordData.searchQuery, perPage, page);

    // Convert OpenAlex works to the format expected by the frontend
    const papers = searchResult.results.map(convertOpenAlexWorkToPaper);

    // Check if we got rate limited or no results
    if (papers.length === 0) {
      const warningMessage = 'No papers found. This may be due to rate limiting from OpenAlex API or no relevant papers available. Please try again in a few moments or select different text.';
      
      return new Response(JSON.stringify({
        keywords: keywordData.keywords,
        searchQuery: keywordData.searchQuery,
        papers: [],
        totalFound: 0,
        page,
        perPage,
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
      totalFound: searchResult.count,
      page,
      perPage
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
