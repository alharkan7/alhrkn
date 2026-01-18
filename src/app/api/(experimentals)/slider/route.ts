import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

// Initialize Gemini AI
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  generationConfig: {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 4096,
  },
});

// JSON Schema for slide generation
const slideSchema = {
  type: 'object',
  properties: {
    slides: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          type: {
            type: 'string',
            enum: ['title', 'content', 'bullet_points', 'quote', 'image_placeholder', 'conclusion']
          },
          notes: { type: 'string' }
        },
        required: ['title', 'content', 'type'],
        propertyOrdering: ['title', 'content', 'type', 'notes']
      },
      minItems: 1,
      maxItems: 20
    },
    theme: { type: 'string' },
    estimatedDuration: { type: 'string' }
  },
  required: ['slides'],
  propertyOrdering: ['slides', 'theme', 'estimatedDuration']
};

const SYSTEM_PROMPT = `You are an expert presentation designer specializing in converting text documents into effective slide decks. Your task is to analyze any text document and transform it into a well-structured presentation with the following guidelines:

CONTENT ANALYSIS:
- Identify the main topic, key points, and document structure
- Recognize document types: academic papers, reports, meeting notes, tutorials, articles, etc.
- Extract hierarchical information and logical flow

SLIDE DESIGN PRINCIPLES:
- Create 3-15 slides depending on content length and complexity
- Each slide should have a clear, concise title (max 50 characters)
- Use appropriate slide types: title slides, content slides, bullet points, quotes, conclusions
- Break down complex information into digestible chunks
- Maintain logical flow and narrative progression

CONTENT FORMATTING:
- Use markdown formatting for emphasis and structure
- Create concise bullet points for lists and key information
- Include relevant quotes or important statements
- Add speaker notes when helpful for complex topics

PRESENTATION STRUCTURE:
1. Title slide with main topic
2. Overview/Introduction
3. Main content sections (2-8 slides)
4. Key takeaways/Conclusion
5. Q&A or next steps (if appropriate)

Ensure the presentation is engaging, professional, and suitable for the target audience. Focus on clarity, visual hierarchy, and impactful messaging.

Return a JSON structure that can be directly converted to Marp slides.`;

export async function POST(request: NextRequest) {
  try {
    const { text, theme = 'default' } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      );
    }

    if (text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Text content must be at least 50 characters long' },
        { status: 400 }
      );
    }

    // Use LLM to analyze and structure the content
    const userPrompt = `Convert this text document into a structured slide presentation:

TEXT CONTENT:
${text}

Please analyze this content and create a JSON structure with:
- Well-organized slides with titles and content
- Appropriate slide types (title, content, bullet_points, quote, conclusion)
- Logical flow and structure
- Speaker notes where helpful
- Estimated presentation duration

Focus on creating an engaging, professional presentation that effectively communicates the key information.`;

    console.log('Starting LLM call for slide generation...');

    // Add timeout to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('LLM request timeout')), 30000); // 30 second timeout
    });

    const llmPromise = model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: slideSchema as any
      }
    });

    const result = await Promise.race([llmPromise, timeoutPromise]) as any;
    console.log('LLM call completed successfully');

    const responseText = result.response.text().trim();
    console.log('LLM response length:', responseText.length);

    let slideData: any;
    try {
      slideData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError);
      console.log('Raw response:', responseText);

      // Fallback: Create basic slides from the original text
      slideData = createFallbackSlides(text);
    }

    if (!slideData.slides || !Array.isArray(slideData.slides)) {
      console.error('Invalid slide structure, using fallback');
      slideData = createFallbackSlides(text);
    }

    // Convert structured slides to Marp markdown
    const marpContent = generateMarpMarkdown(slideData.slides, theme);
    console.log('Generated Marp content length:', marpContent.length);
    console.log('Marp content preview:', marpContent.substring(0, 300));

    // Create temporary files
    const tempDir = tmpdir();
    const inputFile = path.join(tempDir, `input-${Date.now()}.md`);
    const outputFile = path.join(tempDir, `output-${Date.now()}.html`);

    // Write Marp markdown file
    await writeFile(inputFile, marpContent, 'utf-8');
    console.log('Marp file written to:', inputFile);

    try {
      // Use Marp CLI to convert to HTML with timeout
      console.log('Starting Marp CLI conversion...');

      // Add timeout for Marp CLI execution
      const marpTimeout = 45000; // 45 seconds
      const marpPromise = execAsync(
        `npx @marp-team/marp-cli@latest ${inputFile} --output ${outputFile} --html --allow-local-files`,
        { cwd: process.cwd() }
      );

      const marpTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Marp CLI timeout')), marpTimeout);
      });

      let { stdout, stderr } = await Promise.race([marpPromise, marpTimeoutPromise]) as any;
      console.log('Marp CLI stdout:', stdout);

      if (stderr && !stderr.includes(' Converting')) {
        console.warn('Marp CLI stderr:', stderr);
      } else {
        console.log('Marp CLI conversion completed successfully');
      }

      // Read the generated HTML
      const fs = await import('fs/promises');
      const htmlContent = await fs.readFile(outputFile, 'utf-8');
      console.log('Generated HTML length:', htmlContent.length);

      // Extract slides from HTML
      const slidesMatch = htmlContent.match(/<section[^>]*>[\s\S]*?<\/section>/g);
      const slides = slidesMatch ? slidesMatch.map(slide => slide.trim()) : [];
      console.log('Extracted slides count:', slides.length);

      if (slides.length === 0) {
        console.error('No slides extracted from HTML. HTML content:', htmlContent.substring(0, 500));
        throw new Error('Marp CLI failed to generate slides');
      }

      console.log('Returning successful response with', slides.length, 'slides');
      return NextResponse.json({
        success: true,
        slides: slides,
        html: htmlContent,
        theme: theme,
        slideCount: slideData.slides.length,
        estimatedDuration: slideData.estimatedDuration || '10-15 minutes'
      });

    } catch (marpError: any) {
      console.error('Marp CLI error:', marpError.message);

      // Fallback: Return raw slides without Marp processing
      console.log('Using fallback: returning raw slides without Marp processing');

      // Convert slides to basic HTML
      const fallbackHtml = generateFallbackHtml(slideData.slides, theme);
      const fallbackSlides = slideData.slides.map((slide: any, index: number) => {
        return `<section data-marpit-slide="${index}"><h1>${slide.title}</h1><p>${slide.content}</p></section>`;
      });

      return NextResponse.json({
        success: true,
        slides: fallbackSlides,
        html: fallbackHtml,
        theme: theme,
        slideCount: slideData.slides.length,
        estimatedDuration: slideData.estimatedDuration || '10-15 minutes',
        warning: 'Used fallback rendering due to Marp CLI issues'
      });

    } finally {
      // Clean up temporary files
      try {
        await unlink(inputFile);
        await unlink(outputFile);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp files:', cleanupError);
      }
    }

  } catch (error) {
    console.error('Slider API error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timed out. Please try with shorter text or try again.' },
          { status: 408 }
        );
      }

      if (error.message.includes('Marp CLI timeout')) {
        return NextResponse.json(
          { error: 'Slide rendering timed out. Using fallback presentation.' },
          { status: 408 }
        );
      }

      if (error.message.includes('API_KEY')) {
        return NextResponse.json(
          { error: 'API configuration error. Please contact support.' },
          { status: 500 }
        );
      }

      if (error.message.includes('quota') || error.message.includes('limit')) {
        return NextResponse.json(
          { error: 'API quota exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to convert text to slides' },
      { status: 500 }
    );
  }
}

// Fallback function to create basic slides when LLM fails
function createFallbackSlides(text: string): any {
  console.log('Creating fallback slides for text length:', text.length);

  const words = text.split(' ');
  const slides = [];
  const wordsPerSlide = 100; // Roughly 100 words per slide

  // Create title slide
  slides.push({
    title: 'Presentation',
    content: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
    type: 'title'
  });

  // Create content slides
  for (let i = 0; i < words.length; i += wordsPerSlide) {
    const slideWords = words.slice(i, i + wordsPerSlide);
    const slideContent = slideWords.join(' ');

    slides.push({
      title: `Slide ${slides.length + 1}`,
      content: slideContent,
      type: 'content'
    });
  }

  return {
    slides: slides,
    estimatedDuration: `${Math.ceil(slides.length * 2)}-minute presentation`
  };
}

// Fallback HTML generator when Marp CLI fails
function generateFallbackHtml(slides: any[], theme: string): string {
  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0;
        padding: 20px;
        background: #f5f5f5;
      }
      .slide {
        background: white;
        margin: 20px auto;
        max-width: 800px;
        min-height: 400px;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .slide h1 {
        color: #333;
        font-size: 2.5rem;
        margin-bottom: 1rem;
        text-align: center;
      }
      .slide p {
        font-size: 1.2rem;
        line-height: 1.6;
        color: #555;
      }
      .slide ul {
        font-size: 1.2rem;
        line-height: 1.8;
        color: #555;
      }
      .slide blockquote {
        font-style: italic;
        border-left: 4px solid #007bff;
        padding-left: 1rem;
        margin: 1rem 0;
        color: #666;
      }
      .navigation {
        text-align: center;
        margin: 20px 0;
        padding: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .nav-button {
        display: inline-block;
        margin: 0 10px;
        padding: 10px 20px;
        background: #007bff;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        cursor: pointer;
      }
      .nav-button:hover {
        background: #0056b3;
      }
      .warning {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        color: #856404;
        padding: 12px;
        border-radius: 4px;
        margin: 20px auto;
        max-width: 800px;
        text-align: center;
      }
    </style>
  `;

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Presentation Slides</title>
      ${styles}
    </head>
    <body>
      <div class="warning">
        ⚠️ This presentation was generated using fallback rendering due to technical issues.
        For best results, try again later or use a smaller document.
      </div>
  `;

  slides.forEach((slide: any, index: number) => {
    html += `<div class="slide" id="slide-${index}">`;

    // Title
    html += `<h1>${slide.title}</h1>`;

    // Content based on type
    switch (slide.type) {
      case 'bullet_points':
        const points = slide.content.split('\n').filter((line: string) => line.trim());
        html += '<ul>';
        points.forEach((point: string) => {
          html += `<li>${point.trim()}</li>`;
        });
        html += '</ul>';
        break;

      case 'quote':
        html += `<blockquote>${slide.content}</blockquote>`;
        break;

      default:
        html += `<p>${slide.content.replace(/\n/g, '<br>')}</p>`;
        break;
    }

    html += '</div>';
  });

  // Navigation
  html += `
    <div class="navigation">
      <button class="nav-button" onclick="prevSlide()">Previous</button>
      <span id="slide-counter">Slide 1 of ${slides.length}</span>
      <button class="nav-button" onclick="nextSlide()">Next</button>
    </div>

    <script>
      let currentSlide = 0;
      const totalSlides = ${slides.length};
      const slides = document.querySelectorAll('.slide');

      function showSlide(index) {
        slides.forEach((slide, i) => {
          slide.style.display = i === index ? 'flex' : 'none';
        });
        document.getElementById('slide-counter').textContent = \`Slide \${index + 1} of \${totalSlides}\`;
        currentSlide = index;
      }

      function nextSlide() {
        const next = (currentSlide + 1) % totalSlides;
        showSlide(next);
      }

      function prevSlide() {
        const prev = (currentSlide - 1 + totalSlides) % totalSlides;
        showSlide(prev);
      }

      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          nextSlide();
        } else if (e.key === 'ArrowLeft') {
          prevSlide();
        }
      });

      // Initialize
      showSlide(0);
    </script>
    </body>
    </html>
  `;

  return html;
}

// Helper function to generate Marp markdown from structured slides
function generateMarpMarkdown(slides: any[], theme: string): string {
  let marpContent = `---\nmarp: true\ntheme: ${theme}\n---\n\n`;

  slides.forEach((slide, index) => {
    // Add slide separator for all slides except the first
    if (index > 0) {
      marpContent += '\n---\n\n';
    }

    // Add slide title
    marpContent += `# ${slide.title}\n\n`;

    // Add slide content based on type
    switch (slide.type) {
      case 'title':
        marpContent += `${slide.content}\n\n`;
        if (slide.notes) {
          marpContent += `<!-- ${slide.notes} -->\n\n`;
        }
        break;

      case 'bullet_points':
        const points = slide.content.split('\n').filter((line: string) => line.trim());
        points.forEach((point: string) => {
          marpContent += `- ${point.trim()}\n`;
        });
        marpContent += '\n';
        if (slide.notes) {
          marpContent += `<!-- ${slide.notes} -->\n\n`;
        }
        break;

      case 'quote':
        marpContent += `> ${slide.content}\n\n`;
        if (slide.notes) {
          marpContent += `<!-- ${slide.notes} -->\n\n`;
        }
        break;

      case 'content':
      default:
        marpContent += `${slide.content}\n\n`;
        if (slide.notes) {
          marpContent += `<!-- ${slide.notes} -->\n\n`;
        }
        break;
    }
  });

  return marpContent;
}
