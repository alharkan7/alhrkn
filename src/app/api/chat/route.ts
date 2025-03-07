import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { NextRequest } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { tools, handleCalculate } from '@/utils/tools';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
    },
    tools: tools  // Add tools configuration
});

// Helper function to get file extension from mime type
function getFileExtension(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
        // Images
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',

        // Code files
        'text/x-c': 'c',
        'text/x-cpp': 'cpp',
        'text/x-python': 'py',
        'text/x-java': 'java',
        'text/x-php': 'php',
        'text/x-sql': 'sql',

        // Documents
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/rtf': 'rtf',
        'application/vnd.ms-word.template.macroenabled.12': 'dot',
        'application/vnd.openxmlformats-officedocument.wordprocessingtemplate': 'dotx',
        'application/x-hwp': 'hwp',
        'application/x-hwpx': 'hwpx',

        // Google Workspace
        'application/vnd.google-apps.document': 'gdoc',
        'application/vnd.google-apps.presentation': 'gslides',
        'application/vnd.google-apps.spreadsheet': 'gsheet',

        // Presentations
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',

        // Spreadsheets
        'application/vnd.ms-excel': 'xls',
        'text/csv': 'csv',

        // Plain text
        'text/plain': 'txt',
        'text/markdown': 'md'
    };
    return mimeToExt[mimeType] || 'bin';
}

// Helper function to convert base64 to buffer and upload to Gemini
type FileUploadResult = {
    mimeType: string;
    data?: string;
    fileUri?: string;
};

async function uploadBase64ToGemini(base64String: string, mimeType: string, fileName: string): Promise<FileUploadResult> {
    try {
        console.log('Starting file upload to Gemini:', { mimeType, fileName });
        const base64Data = base64String.replace(/^data:.*;base64,/, '');

        if (!base64Data) {
            throw new Error('Invalid file data');
        }

        // For all files, check size limit (5MB for images, larger for other files)
        const fileSizeInBytes = Buffer.from(base64Data, 'base64').length;
        const maxSize = mimeType.startsWith('image/') ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
        
        if (fileSizeInBytes > maxSize) {
            throw new Error(`File size exceeds limit of ${maxSize / (1024 * 1024)}MB`);
        }

        // Handle images directly with inline data
        if (mimeType.startsWith('image/')) {
            return {
                mimeType,
                data: base64Data
            };
        }

        // For other files, use file manager
        const buffer = Buffer.from(base64Data, 'base64');
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gemini-'));
        const extension = getFileExtension(mimeType);
        const tempFilePath = path.join(tempDir, `${crypto.randomUUID()}.${extension}`);

        await fs.writeFile(tempFilePath, buffer);

        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: mimeType,
            displayName: fileName
        });

        await fs.unlink(tempFilePath);
        await fs.rmdir(tempDir);

        return {
            mimeType: uploadResult.file.mimeType,
            fileUri: uploadResult.file.uri
        };
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

// Add system prompt configuration
const SYSTEM_PROMPT = `You are a helpful AI assistant. You can help with a wide range of tasks including:
- Answering questions on any topic
- Writing and analyzing code
- Mathematical calculations (using the calculate function when needed)
- Explaining complex concepts
- Helping with analysis and problem-solving
- Processing and analyzing images and documents

For mathematical calculations, use the calculate function only when precise computation is needed. Otherwise, provide direct answers to questions.

Use markdown formatting to style your text answer to make it more readable and appealing for user.`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages array is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Create encoder for streaming
        const encoder = new TextEncoder();

        // Create the stream
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const chat = model.startChat({
                        history: [],
                        generationConfig: {
                            temperature: 0.7,
                            topP: 0.8,
                            topK: 40,
                            maxOutputTokens: 8192,
                        }
                    });

                    // Send system prompt first
                    await chat.sendMessage([{ text: SYSTEM_PROMPT }]);

                    // Process all messages except the last one
                    for (let i = 0; i < messages.length - 1; i++) {
                        const msg = messages[i];
                        if (msg.role === 'user') {
                            const parts: any[] = [];

                            // Handle file content if present
                            if (Array.isArray(msg.content)) {
                                for (const part of msg.content) {
                                    if (part.type === 'image_url' && part.image_url?.url) {
                                        console.log('Processing image URL in message');
                                        try {
                                            const fileData = await uploadBase64ToGemini(
                                                part.image_url.url,
                                                'image/jpeg',
                                                'uploaded_image.jpg'
                                            );
                                            parts.push({
                                                inlineData: {
                                                    mimeType: fileData.mimeType,
                                                    data: fileData.data!
                                                }
                                            });
                                            console.log('Successfully processed image');
                                        } catch (error) {
                                            console.error('Failed to process image:', error);
                                            parts.push({ text: "⚠️ Failed to process image" });
                                        }
                                    } else if (part.type === 'file_url' && part.file_url?.url) {
                                        // Upload file to Gemini
                                        const fileData = await uploadBase64ToGemini(
                                            part.file_url.url,
                                            part.file_url.type,
                                            part.file_url.name
                                        );
                                        if (fileData.fileUri) {
                                            parts.push({
                                                fileData: {
                                                    mimeType: fileData.mimeType,
                                                    fileUri: fileData.fileUri,
                                                }
                                            });
                                        } else if (fileData.data) {
                                            parts.push({
                                                inlineData: {
                                                    mimeType: fileData.mimeType,
                                                    data: fileData.data
                                                }
                                            });
                                        }
                                    } else if (part.type === 'text') {
                                        parts.push({ text: part.text });
                                    }
                                }
                            } else {
                                parts.push({ text: msg.content });
                            }

                            await chat.sendMessage(parts);
                        }
                    }

                    // Handle the last message separately
                    const lastMessage = messages[messages.length - 1];
                    const lastParts: any[] = [];

                    if (Array.isArray(lastMessage.content)) {
                        for (const part of lastMessage.content) {
                            if (part.type === 'image_url' && part.image_url?.url) {
                                const fileData = await uploadBase64ToGemini(
                                    part.image_url.url,
                                    'image/jpeg',
                                    'uploaded_image.jpg'
                                );
                                lastParts.push({
                                    inlineData: {
                                        mimeType: fileData.mimeType,
                                        data: fileData.data!
                                    }
                                });
                            } else if (part.type === 'file_url' && part.file_url?.url) {
                                const fileData = await uploadBase64ToGemini(
                                    part.file_url.url,
                                    part.file_url.type,
                                    part.file_url.name
                                );
                                if (fileData.fileUri) {
                                    lastParts.push({
                                        fileData: {
                                            mimeType: fileData.mimeType,
                                            fileUri: fileData.fileUri,
                                        }
                                    });
                                } else if (fileData.data) {
                                    lastParts.push({
                                        inlineData: {
                                            mimeType: fileData.mimeType,
                                            data: fileData.data
                                        }
                                    });
                                }
                            } else if (part.type === 'text') {
                                lastParts.push({ text: part.text });
                            }
                        }
                    } else {
                        lastParts.push({ text: lastMessage.content });
                    }

                    // Get final response
                    const result = await chat.sendMessage(lastParts);
                    const text = await result.response.text();

                    // Ensure we have a response before streaming
                    if (!text) {
                        throw new Error('Empty response from Gemini');
                    }

                    // Stream the response with initial marker and delay
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: '' })}\n\n`));
                    await new Promise(resolve => setTimeout(resolve, 100)); // Initial delay

                    // Stream the response in smaller chunks
                    const chunkSize = 1; // Reduce chunk size
                    const words = text.split(' ');

                    for (let i = 0; i < words.length; i += chunkSize) {
                        const chunk = words.slice(i, i + chunkSize).join(' ') + ' ';
                        const data = { content: chunk };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                        await new Promise(resolve => setTimeout(resolve, 5)); // Smaller delay between chunks
                    }

                    // Send end marker with delay
                    await new Promise(resolve => setTimeout(resolve, 100));
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: '\n' })}\n\n`));
                } catch (error) {
                    console.error('Streaming error:', error);
                    controller.error(error);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}