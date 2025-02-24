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
        // Remove data URL prefix if present
        const base64Data = base64String.replace(/^data:.*;base64,/, '');
        
        // For images, we can return the data directly since Gemini accepts base64
        if (mimeType.startsWith('image/')) {
            return {
                mimeType,
                data: base64Data
            };
        }

        // For other files, we need to use the file manager
        const buffer = Buffer.from(base64Data, 'base64');
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gemini-'));
        const extension = getFileExtension(mimeType);
        const tempFilePath = path.join(tempDir, `${crypto.randomUUID()}.${extension}`);

        // Write buffer to temporary file
        await fs.writeFile(tempFilePath, buffer);

        // Upload to Gemini with metadata
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: mimeType,
            displayName: fileName
        });

        // Clean up temporary file
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

For mathematical calculations, use the calculate function only when precise computation is needed.
Otherwise, provide direct answers to questions.`;

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
        await chat.sendMessage([{
            text: SYSTEM_PROMPT
        }]);

        // Process each message in the history
        for (const msg of messages) {
            if (msg.role === 'user') {
                const parts: any[] = [];

                // Handle file content if present
                if (Array.isArray(msg.content)) {
                    for (const part of msg.content) {
                        if (part.type === 'image_url' && part.image_url?.url) {
                            // Upload image to Gemini
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

                const response = await chat.sendMessage(parts);
                
                // Check if the response contains a function call
                if (response.response.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
                    const functionCall = response.response.candidates[0].content.parts[0].functionCall;
                    
                    if (functionCall.name === 'calculate') {
                        try {
                            const result = handleCalculate(functionCall.args);
                            await chat.sendMessage([{
                                text: `The result of the calculation is: ${result}`
                            }]);
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            await chat.sendMessage([{
                                text: `Error performing calculation: ${errorMessage}`
                            }]);
                        }
                    }
                }
            }
        }

        // Get response from the model using the last message parts
        const lastMessage = messages[messages.length - 1];
        const lastParts: any[] = [];

        if (Array.isArray(lastMessage.content)) {
            for (const part of lastMessage.content) {
                if (part.type === 'text') {
                    lastParts.push({ text: part.text });
                }
            }
        } else {
            lastParts.push({ text: lastMessage.content });
        }

        const result = await chat.sendMessage(lastParts);

        // Create a readable stream for the response
        const stream = new ReadableStream({

            async start(controller) {
                const response = result.response;
                const text = await response.text();

                // Send the text in chunks
                const chunks = text.split(' ');
                for (const chunk of chunks) {
                    const data = {
                        content: chunk + ' '
                    };
                    controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
                    // Add a small delay between chunks for a more natural feel
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                controller.close();
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
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
