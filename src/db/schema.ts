// src/lib/db/schema.ts
import { 
    pgTable, 
    uuid, 
    text, 
    timestamp, 
    boolean, 
    integer, 
    doublePrecision, 
    jsonb 
  } from 'drizzle-orm/pg-core';
  import { relations } from 'drizzle-orm';
  
  // Main mindmaps table
  export const mindmaps = pgTable('mindmaps', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title'),
    inputType: text('input_type').notNull().$type<'pdf' | 'text' | 'url'>(),
    pdfUrl: text('pdf_url'),
    fileName: text('file_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    sourceUrl: text('source_url'),
    isExample: boolean('is_example').default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }).defaultNow(),
  });
  
  // Nodes table
  export const mindmapNodes = pgTable('mindmap_nodes', {
    id: uuid('id').primaryKey().defaultRandom(),
    mindmapId: uuid('mindmap_id')
      .notNull()
      .references(() => mindmaps.id, { onDelete: 'cascade' }),
    nodeId: text('node_id').notNull(), // Frontend visualization ID
    title: text('title').notNull(),
    description: text('description'),
    parentId: text('parent_id'), // null for root node
    level: integer('level').notNull(),
    pageNumber: integer('page_number'),
    positionX: doublePrecision('position_x'),
    positionY: doublePrecision('position_y'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  });
  
  // Edges table
  export const mindmapEdges = pgTable('mindmap_edges', {
    id: uuid('id').primaryKey().defaultRandom(),
    mindmapId: uuid('mindmap_id')
      .notNull()
      .references(() => mindmaps.id, { onDelete: 'cascade' }),
    sourceNodeId: text('source_node_id').notNull(),
    targetNodeId: text('target_node_id').notNull(),
    style: jsonb('style').$type<{
      // Define your edge style properties here
      color?: string;
      width?: number;
      type?: 'default' | 'smooth' | 'step';
      animated?: boolean;
    }>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  });
  
  // Chat history table
  export const mindmapChatHistory = pgTable('mindmap_chat_history', {
    id: uuid('id').primaryKey().defaultRandom(),
    mindmapId: uuid('mindmap_id')
      .notNull()
      .references(() => mindmaps.id, { onDelete: 'cascade' }),
    role: text('role').$type<'user' | 'assistant'>().notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  });
  
  // Relations
  export const mindmapsRelations = relations(mindmaps, ({ many }) => ({
    nodes: many(mindmapNodes),
    edges: many(mindmapEdges),
    chatHistory: many(mindmapChatHistory),
  }));
  
  export const mindmapNodesRelations = relations(mindmapNodes, ({ one }) => ({
    mindmap: one(mindmaps, {
      fields: [mindmapNodes.mindmapId],
      references: [mindmaps.id],
    }),
  }));
  
  export const mindmapEdgesRelations = relations(mindmapEdges, ({ one }) => ({
    mindmap: one(mindmaps, {
      fields: [mindmapEdges.mindmapId],
      references: [mindmaps.id],
    }),
  }));
  
  export const mindmapChatHistoryRelations = relations(mindmapChatHistory, ({ one }) => ({
    mindmap: one(mindmaps, {
      fields: [mindmapChatHistory.mindmapId],
      references: [mindmaps.id],
    }),
  }));
  
  // Types for TypeScript
  export type Mindmap = typeof mindmaps.$inferSelect;
  export type NewMindmap = typeof mindmaps.$inferInsert;
  
  export type MindmapNode = typeof mindmapNodes.$inferSelect;
  export type NewMindmapNode = typeof mindmapNodes.$inferInsert;
  
  export type MindmapEdge = typeof mindmapEdges.$inferSelect;
  export type NewMindmapEdge = typeof mindmapEdges.$inferInsert;
  
  export type MindmapChatHistory = typeof mindmapChatHistory.$inferSelect;
  export type NewMindmapChatHistory = typeof mindmapChatHistory.$inferInsert;