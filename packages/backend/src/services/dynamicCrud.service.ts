import { AppDataSource } from '../database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { CrudPage } from '../database/entities/CrudPage';
import { CreateCrudPageData } from '../schemas/crudPage.schema';

type Field = CreateCrudPageData['fields'][0];

interface CrudPageSchema {
  fields: Field[];
  tableName: string;
  description: string;
}

interface TypedCrudPage extends Omit<CrudPage, 'schema'> {
  schema: CrudPageSchema;
}

class DynamicCrudService {
  private getTableName(page: TypedCrudPage): string {
    return `dynamic_${page.schema.tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
  }

  async createTable(page: TypedCrudPage): Promise<void> {
    try {
      const tableName = this.getTableName(page);

      logger.info('Creating table:', {
        fields: page.schema.fields,
        tableName,
      });

      const fieldDefinitions = page.schema.fields.map(field => {
        const sqlType = this.mapJsonSchemaTypeToSQL(field);
        return `"${field.name}" ${sqlType}${field.required ? ' NOT NULL' : ''}${field.unique ? ' UNIQUE' : ''}`;
      }).join(',\n          ');

      const sql = `
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id SERIAL PRIMARY KEY,
          ${fieldDefinitions},
          user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

      logger.info('Creating table with SQL:', { sql });
      await AppDataSource.query(sql);

      // Create an update trigger for updated_at
      const triggerSQL = `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ language 'plpgsql';

        DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON "${tableName}";
        
        CREATE TRIGGER update_${tableName}_updated_at
          BEFORE UPDATE ON "${tableName}"
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `;
      await AppDataSource.query(triggerSQL);

      // Create indexes for unique fields
      for (const field of page.schema.fields) {
        if (field.unique) {
          const indexName = `idx_${tableName}_${field.name}`;
          const indexSql = `
            CREATE UNIQUE INDEX IF NOT EXISTS "${indexName}"
            ON "${tableName}" ("${field.name}", user_id)
          `;
          await AppDataSource.query(indexSql);
        }
      }

      // Verify table exists
      const tableCheck = await AppDataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName.toLowerCase()]);

      if (!tableCheck[0].exists) {
        throw new AppError(500, `Failed to create table ${tableName}`);
      }

      logger.info('Table created successfully:', { tableName });
    } catch (error) {
      logger.error('Error creating table:', error);
      throw error;
    }
  }

  async dropTable(page: TypedCrudPage): Promise<void> {
    const tableName = this.getTableName(page);
    try {
      await AppDataSource.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      logger.info(`Dropped table ${tableName}`);
    } catch (error) {
      logger.error(`Failed to drop table ${tableName}:`, error);
      throw new AppError(500, `Failed to drop table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAll(
    page: TypedCrudPage,
    userId: string,
    query: Record<string, any> = {}
  ): Promise<any[]> {
    const tableName = this.getTableName(page);
    const { sort, filter, page: pageNum = 1, limit = 10 } = query;

    try {
      let sql = `SELECT * FROM "${tableName}" WHERE user_id = $1`;
      const params: any[] = [userId];
      let paramCount = 1;

      // Apply filters
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          sql += ` AND "${key}" = $${++paramCount}`;
          params.push(value);
        });
      }

      // Apply sorting
      if (sort) {
        const [field, order] = sort.split(':');
        sql += ` ORDER BY "${field}" ${order === 'desc' ? 'DESC' : 'ASC'}`;
      }

      // Apply pagination
      const offset = (pageNum - 1) * limit;
      sql += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await AppDataSource.query(sql, params);
      return result;
    } catch (error) {
      logger.error('Error fetching dynamic data:', error);
      throw new AppError(500, 'Failed to fetch data');
    }
  }

  async getById(page: TypedCrudPage, id: string, userId: string): Promise<any> {
    const tableName = this.getTableName(page);

    try {
      const result = await AppDataSource.query(
        `SELECT * FROM "${tableName}" WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (result.length === 0) {
        throw new AppError(404, 'Record not found');
      }

      return result[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching dynamic record:', error);
      throw new AppError(500, 'Failed to fetch record');
    }
  }

  async create(page: TypedCrudPage, data: Record<string, any>, userId: string): Promise<any> {
    const tableName = this.getTableName(page);

    try {
      // Log incoming data and schema for debugging
      logger.info('Creating record:', { 
        tableName,
        schemaFields: page.schema.fields,
        incomingData: data
      });

      // Get valid field names from schema
      const validFields = page.schema.fields.map(field => field.name);

      // Filter out any data fields that don't exist in the schema
      const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
        if (validFields.includes(key)) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      // Validate data against schema
      this.validateData(filteredData, {
        properties: page.schema.fields.reduce((acc, field) => ({
          ...acc,
          [field.name]: {
            type: field.type,
            required: field.required,
            unique: field.unique
          }
        }), {})
      });

      const columns = Object.keys(filteredData);
      const values = Object.values(filteredData);
      const placeholders = values.map((_, i) => `$${i + 2}`);

      const sql = `
        INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}, user_id)
        VALUES (${placeholders.join(', ')}, $1)
        RETURNING *
      `;

      const result = await AppDataSource.query(sql, [userId, ...values]);
      return result[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating dynamic record:', error);
      throw new AppError(500, 'Failed to create record');
    }
  }

  async update(page: TypedCrudPage, id: string, data: Record<string, any>, userId: string): Promise<any> {
    const tableName = this.getTableName(page);

    try {
      // Get valid field names from schema
      const validFields = page.schema.fields.map(field => field.name);

      // Filter out any data fields that don't exist in the schema
      const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
        if (validFields.includes(key)) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      // Validate data against schema
      this.validateData(filteredData, {
        properties: page.schema.fields.reduce((acc, field) => ({
          ...acc,
          [field.name]: {
            type: field.type,
            required: field.required,
            unique: field.unique
          }
        }), {})
      });

      const setClause = Object.keys(filteredData)
        .map((key, index) => `"${key}" = $${index + 3}`)
        .join(', ');

      const sql = `
        UPDATE "${tableName}"
        SET ${setClause}
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await AppDataSource.query(sql, [id, userId, ...Object.values(filteredData)]);

      if (result.length === 0) {
        throw new AppError(404, 'Record not found');
      }

      return result[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating dynamic record:', error);
      throw new AppError(500, 'Failed to update record');
    }
  }

  async delete(page: TypedCrudPage, id: string, userId: string): Promise<void> {
    const tableName = this.getTableName(page);

    try {
      const result = await AppDataSource.query(
        `DELETE FROM "${tableName}" WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (result.rowCount === 0) {
        throw new AppError(404, 'Record not found');
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting dynamic record:', error);
      throw new AppError(500, 'Failed to delete record');
    }
  }

  private mapJsonSchemaTypeToSQL(field: Field): string {
    switch (field.type.toLowerCase()) {
      case 'string':
      case 'text':
        return 'TEXT';
      case 'number':
        return 'NUMERIC';
      case 'integer':
        return 'INTEGER';
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'TIMESTAMP';
      case 'email':
        return 'TEXT';
      case 'url':
        return 'TEXT';
      case 'select':
        return 'TEXT';
      default:
        return 'TEXT';
    }
  }

  private validateData(data: Record<string, any>, schema: { properties: Record<string, any> }): void {
    const errors: string[] = [];

    // Check required fields
    Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
      if (fieldSchema.required && !data[fieldName]) {
        errors.push(`Field "${fieldName}" is required`);
      }
    });

    // Validate field types
    Object.entries(data).forEach(([fieldName, value]) => {
      const fieldSchema = schema.properties[fieldName];
      if (fieldSchema) {
        const error = this.validateFieldType(fieldName, value, fieldSchema.type);
        if (error) {
          errors.push(error);
        }
      }
    });

    if (errors.length > 0) {
      throw new AppError(400, `Validation failed: ${errors.join(', ')}`);
    }
  }

  private validateFieldType(fieldName: string, value: any, type: string): string | null {
    if (value === null || value === undefined) return null;

    switch (type.toLowerCase()) {
      case 'string':
      case 'text':
      case 'email':
      case 'url':
      case 'select':
        if (typeof value !== 'string') {
          return `Field "${fieldName}" must be a string`;
        }
        break;
      case 'number':
      case 'integer':
        if (typeof value !== 'number') {
          return `Field "${fieldName}" must be a number`;
        }
        if (type === 'integer' && !Number.isInteger(value)) {
          return `Field "${fieldName}" must be an integer`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `Field "${fieldName}" must be a boolean`;
        }
        break;
      case 'date':
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
          return `Field "${fieldName}" must be a valid date`;
        }
        break;
    }
    return null;
  }
}

// Export a singleton instance
export const dynamicCrudService = new DynamicCrudService(); 