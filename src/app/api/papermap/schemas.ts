import { z } from "zod";

export const MindmapNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  parentId: z.string().nullable(),
  level: z.number(),
  pageNumber: z.number().nullable(),
});

export const MindmapSchema = z.object({
  nodes: z.array(MindmapNodeSchema),
});

export const AnswerSchema = z.object({
  answer: z.string(),
}); 