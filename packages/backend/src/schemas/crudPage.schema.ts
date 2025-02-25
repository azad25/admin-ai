import { z } from 'zod';

export const FieldSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  type: z.string().min(1, 'Field type is required'),
  required: z.boolean().default(false),
  unique: z.boolean().optional(),
});

export const CreateCrudPageSchema = z.object({
  name: z.string().min(1, 'Page name is required'),
  description: z.string().optional(),
  tableName: z.string().min(1, 'Table name is required'),
  fields: z.array(FieldSchema).min(1, 'At least one field is required'),
});

export type CreateCrudPageData = z.infer<typeof CreateCrudPageSchema>; 