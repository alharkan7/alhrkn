import { NextResponse } from 'next/server';

interface OpenAlexWork {
  title: string;
  publication_year: number;
  doi?: string;
  authorships: Array<{
    author: {
      display_name: string;
    };
  }>;
  primary_location?: {
    landing_page_url?: string;
  };
}

export async function POST(request: Request) {
  try {
    const { keywords } = await request.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'Invalid keywords' }, { status: 400 });
    }

    // Filter and process keywords
    const processedKeywords = keywords
      .filter(k => k && typeof k === 'string' && k.length >= 3)
      .map(k => k.trim())
      .slice(0, 3); // Limit to top 3 keywords for better results

    if (processedKeywords.length === 0) {
      return NextResponse.json({ error: 'No valid keywords after processing' }, { status: 400 });
    }

    // Construct search query for OpenAlex with filters for better results
    const query = processedKeywords.join(' AND ');
    const searchUrl = new URL('https://api.openalex.org/works');
    
    // Add search parameters
    searchUrl.searchParams.append('search', query);
    searchUrl.searchParams.append('sort', 'cited_by_count:desc'); // Sort by citation count
    searchUrl.searchParams.append('per_page', '5'); // Get more results to find a valid one
    searchUrl.searchParams.append('filter', 'is_paratext:false'); // Exclude paratext
    searchUrl.searchParams.append('filter', 'publication_year:>2010'); // Recent papers only
    
    console.log('Searching OpenAlex with URL:', searchUrl.toString());

    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WritersUnblock/1.0'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
      // For any other API error, return 204 to indicate no citation available
      return NextResponse.json(null, { status: 204 });
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      // If no results found, return 204 to indicate no citation available
      return NextResponse.json(null, { status: 204 });
    }

    // Find the first valid work from the results
    let validWork: OpenAlexWork | null = null;
    for (const work of data.results) {
      if (work.title && 
          work.publication_year && 
          work.authorships?.length > 0 && 
          work.authorships[0]?.author?.display_name) {
        validWork = work;
        break;
      }
    }

    if (!validWork) {
      // If no valid work found, return 204 to indicate no citation available
      return NextResponse.json(null, { status: 204 });
    }
    
    // Format the citation data
    const citation = {
      title: validWork.title,
      authors: validWork.authorships.map(a => a.author.display_name).filter(Boolean),
      year: validWork.publication_year,
      doi: validWork.doi,
      url: validWork.primary_location?.landing_page_url
    };

    // Validate the formatted citation
    if (!citation.title || !citation.authors.length || !citation.year) {
      // If invalid citation data, return 204 to indicate no citation available
      return NextResponse.json(null, { status: 204 });
    }

    // Cache the result for 1 hour
    return NextResponse.json(
      { citation },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (error) {
    // For any error, return 204 to indicate no citation available
    return NextResponse.json(null, { status: 204 });
  }
}
