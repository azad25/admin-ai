import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { CrudPage } from '../database/entities/CrudPage';
import { CrudData } from '../database/entities/CrudData';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';
import { CreateCrudPageData } from '../schemas/crudPage.schema';
import { z } from 'zod';

export class CrudPagesService {
  private pageRepository: Repository<CrudPage>;
  private dataRepository: Repository<CrudData>;

  constructor() {
    this.pageRepository = AppDataSource.getRepository(CrudPage);
    this.dataRepository = AppDataSource.getRepository(CrudData);
  }

  private validateData(data: Record<string, any>, fields: CreateCrudPageData['fields']): Record<string, any> {
    const schema = z.object(
      fields.reduce((acc, field) => {
        let validator: z.ZodType;
        switch (field.type) {
          case 'string':
            validator = z.string();
            break;
          case 'number':
            validator = z.number();
            break;
          case 'boolean':
            validator = z.boolean();
            break;
          case 'date':
            validator = z.string().datetime();
            break;
          default:
            validator = z.any();
        }
        if (!field.required) {
          validator = validator.optional();
        }
        acc[field.name] = validator;
        return acc;
      }, {} as Record<string, z.ZodType>)
    );

    return schema.parse(data);
  }

  private async verifyOwnership(pageId: string, userId: string): Promise<CrudPage> {
    const page = await this.pageRepository.findOne({
      where: { id: pageId, userId }
    });

    if (!page) {
      throw new AppError(404, 'Page not found or access denied');
    }

    return page;
  }

  async createPage(data: CreateCrudPageData & { userId: string }): Promise<CrudPage> {
    try {
      // Format the endpoint from the table name
      const endpoint = data.tableName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      // Validate unique endpoint
      const existingPage = await this.pageRepository.findOne({
        where: { endpoint, userId: data.userId }
      });
      
      if (existingPage) {
        throw new AppError(400, 'A page with this table name already exists');
      }

      // Create the schema object
      const schema = {
        tableName: data.tableName,
        description: data.description,
        fields: data.fields
      };

      // Create the page with required fields
      const page = this.pageRepository.create({
        name: data.name,
        description: data.description,
        endpoint,
        schema,
        userId: data.userId,
        config: {
          defaultView: 'table',
          allowCreate: true,
          allowEdit: true,
          allowDelete: true
        }
      });

      await this.pageRepository.save(page);
      return page;
    } catch (error) {
      logger.error('Failed to create page:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to create page');
    }
  }

  async getPages(userId: string, page = 1, limit = 10): Promise<{ pages: CrudPage[]; total: number }> {
    try {
      if (!userId) {
        throw new AppError(400, 'User ID is required');
      }
      
      const [pages, total] = await this.pageRepository.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit
      });
      
      return {
        pages: pages.map(page => ({
          ...page,
          fields: page.schema?.fields || []
        })),
        total
      };
    } catch (error) {
      logger.error('Failed to get pages:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to get pages');
    }
  }

  async getPage(id: string, userId: string): Promise<CrudPage> {
    try {
      const page = await this.verifyOwnership(id, userId);
      return {
        ...page,
        fields: page.schema?.fields || []
      };
    } catch (error) {
      logger.error('Failed to get page:', error);
      throw error;
    }
  }

  async updatePage(id: string, userId: string, data: Partial<CrudPage>): Promise<CrudPage> {
    try {
      const page = await this.verifyOwnership(id, userId);
      
      // Don't allow changing userId
      delete data.userId;
      
      Object.assign(page, data);
      await this.pageRepository.save(page);
      return page;
    } catch (error) {
      logger.error('Failed to update page:', error);
      throw error;
    }
  }

  async deletePage(id: string, userId: string): Promise<void> {
    try {
      const page = await this.verifyOwnership(id, userId);
      await this.pageRepository.remove(page);
    } catch (error) {
      logger.error('Failed to delete page:', error);
      throw error;
    }
  }

  async createData(pageId: string, userId: string, data: Record<string, any>): Promise<CrudData> {
    try {
      const page = await this.verifyOwnership(pageId, userId);
      
      // Validate data against schema
      const validatedData = this.validateData(data, page.schema.fields);

      const crudData = this.dataRepository.create({
        pageId,
        data: validatedData
      });
      
      await this.dataRepository.save(crudData);
      return crudData;
    } catch (error) {
      logger.error('Failed to create data:', error);
      throw error;
    }
  }

  async getData(pageId: string, userId: string, page = 1, limit = 10): Promise<{ data: CrudData[]; total: number }> {
    try {
      await this.verifyOwnership(pageId, userId);
      
      const [data, total] = await this.dataRepository.findAndCount({
        where: { pageId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit
      });

      return { data, total };
    } catch (error) {
      logger.error('Failed to get data:', error);
      throw new AppError(500, 'Failed to get data');
    }
  }

  async updateData(pageId: string, dataId: string, userId: string, data: Record<string, any>): Promise<CrudData> {
    try {
      const page = await this.verifyOwnership(pageId, userId);
      
      const crudData = await this.dataRepository.findOne({
        where: { id: dataId, pageId }
      });

      if (!crudData) {
        throw new AppError(404, 'Data not found');
      }

      // Validate data against schema
      const validatedData = this.validateData(data, page.schema.fields);
      
      crudData.data = validatedData;
      await this.dataRepository.save(crudData);
      return crudData;
    } catch (error) {
      logger.error('Failed to update data:', error);
      throw error;
    }
  }

  async deleteData(pageId: string, dataId: string, userId: string): Promise<void> {
    try {
      await this.verifyOwnership(pageId, userId);
      
      const crudData = await this.dataRepository.findOne({
        where: { id: dataId, pageId }
      });

      if (!crudData) {
        throw new AppError(404, 'Data not found');
      }

      await this.dataRepository.remove(crudData);
    } catch (error) {
      logger.error('Failed to delete data:', error);
      throw error;
    }
  }
} 