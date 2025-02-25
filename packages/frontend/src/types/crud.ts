export interface Field {
  name: string;
  type: string;
  required: boolean;
  label: string;
  unique?: boolean;
}

export interface CrudPage {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  fields: Field[];
  schema: {
    type: string;
    properties: Record<string, any>;
    tableName: string;
    description: string;
  };
  config: {
    defaultView: 'table' | 'grid';
    allowCreate: boolean;
    allowEdit: boolean;
    allowDelete: boolean;
  };
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateCrudPageData {
  name: string;
  description: string;
  tableName: string;
  fields: Field[];
}

export interface CrudData {
  id: string;
  pageId: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrudPageField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  options?: Record<string, any>;
}

export interface CrudPageConfig {
  fields: CrudPageField[];
  listFields?: string[];
  searchFields?: string[];
  sortFields?: string[];
  defaultSort?: { field: string; order: 'asc' | 'desc' };
  itemsPerPage?: number;
} 