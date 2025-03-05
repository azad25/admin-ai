import { z } from 'zod';

// User related schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['ADMIN', 'USER']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'USER']).optional(),
});

// API Key related schemas
export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  key: z.string(),
  userId: z.string().uuid(),
  createdAt: z.date(),
  lastUsed: z.date().nullable(),
});

// Dashboard Widget schemas
export const WidgetTypeSchema = z.enum([
  'CHART',
  'TABLE',
  'METRIC',
  'MAP',
  'WEATHER',
  'STATUS',
]);

export const WidgetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: WidgetTypeSchema,
  config: z.record(z.unknown()),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  userId: z.string().uuid(),
});

// CRUD Page schemas
export const CrudFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  unique: z.boolean().optional(),
});

// Schema for creating a new CRUD page
export const CreateCrudPageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  tableName: z.string().min(1, 'Table name is required'),
  fields: z.array(CrudFieldSchema).min(1, 'At least one field is required'),
});

// Full CRUD page schema (includes database fields)
export const CrudPageSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  endpoint: z.string(),
  schema: z.object({
    fields: z.array(CrudFieldSchema),
    tableName: z.string(),
    description: z.string(),
  }),
  config: z.object({
    defaultView: z.string(),
    allowCreate: z.boolean(),
    allowEdit: z.boolean(),
    allowDelete: z.boolean(),
  }),
  userId: z.string().uuid(),
});

// Export types
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
export type WidgetType = z.infer<typeof WidgetTypeSchema>;
export type Widget = z.infer<typeof WidgetSchema>;
export type CrudField = z.infer<typeof CrudFieldSchema>;
export type CrudPage = z.infer<typeof CrudPageSchema>;
export type CreateCrudPage = z.infer<typeof CreateCrudPageSchema>; 