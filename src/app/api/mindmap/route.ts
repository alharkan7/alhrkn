import { pdfExtractSchema } from "@/app/(apps)/mindmap/lib/schemas";
import { google } from "@ai-sdk/google";
import { streamObject } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { files } = await req.json();
  const firstFile = files[0].data;

  const result = await streamObject({
    model: google("gemini-2.0-flash"),
    messages: [
      {
        role: "system",
        content:
          "You are a document analyzer. Extract the most important points from the provided PDF document. Focus on key information, main ideas, and significant details.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Please read this PDF and extract the key points. Include relevant context where helpful.",
          },
          {
            type: "file",
            data: firstFile,
            mimeType: "application/pdf",
          },
        ],
      },
    ],
    schema: pdfExtractSchema,
    output: "object",
    onFinish: ({ object }) => {
      const res = pdfExtractSchema.safeParse(object);
      if (res.error) {
        throw new Error(res.error.errors.map((e) => e.message).join("\n"));
      }
    },
  });

  return result.toTextStreamResponse();
}
