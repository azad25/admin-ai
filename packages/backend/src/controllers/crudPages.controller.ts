import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { CrudPage } from '../database/entities/CrudPage';
import { User } from '../database/entities/User';
import { AppError } from '../middleware/errorHandler';
import { CreateCrudPageData, CreateCrudPageSchema, FieldSchema } from '../schemas/crudPage.schema';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { WebSocketService } from '../services/websocket.service';
import { CrudPagesService } from '../services/crudPages.service';
import { v4 as uuidv4 } from 'uuid';

// Extend Express's Request type
interface RequestWithUser extends Request {
  user: User;
}

const crudPageRepository = AppDataSource.getRepository(CrudPage);

const CACHE_TTL = 3600; // 1 hour
const CACHE_KEY_PREFIX = 'crud_page:';

type Field = CreateCrudPageData['fields'][0];

interface CrudPageSchema {
  fields: Field[];
  tableName: string;
  description: string;
}

interface TypedCrudPage extends CrudPage {
  schema: CrudPageSchema;
}

function validateAndCastCrudPage(page: CrudPage): TypedCrudPage {
  const rawSchema = page.schema;
  
  if (!rawSchema || typeof rawSchema !== 'object') {
    throw new AppError(500, 'Invalid CRUD page schema: schema is not an object');
  }

  try {
    // Validate the schema structure
    const validatedSchema = z.object({
      fields: z.array(FieldSchema),
      tableName: z.string(),
      description: z.string().optional()
    }).parse(rawSchema);

    // Create a new object with the validated schema
    return {
      ...page,
      schema: {
        fields: validatedSchema.fields,
        tableName: validatedSchema.tableName,
        description: validatedSchema.description || 'No description provided'
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(500, `Invalid CRUD page schema: ${error.message}`);
    }
    throw error;
  }
}

export class CrudPagesController {
  private service: CrudPagesService;
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.service = new CrudPagesService();
    this.wsService = wsService;
    
    // Bind methods to ensure proper 'this' context
    this.getPages = this.getPages.bind(this);
    this.getPage = this.getPage.bind(this);
    this.createPage = this.createPage.bind(this);
    this.updatePage = this.updatePage.bind(this);
    this.deletePage = this.deletePage.bind(this);
    this.createData = this.createData.bind(this);
    this.getData = this.getData.bind(this);
    this.updateData = this.updateData.bind(this);
    this.deleteData = this.deleteData.bind(this);
  }

  public async getPages(req: RequestWithUser, res: Response) {
    try {
      const pages = await this.service.getPages(req.user.id);
      res.json(pages);
    } catch (error) {
      logger.error('Failed to get pages', { error });
      throw error;
    }
  }

  public async getPage(req: RequestWithUser, res: Response) {
    try {
      const page = await this.service.getPage(req.params.id, req.user.id);
      if (!page) {
        throw new AppError(404, 'Page not found');
      }
      res.json(page);
    } catch (error) {
      logger.error('Failed to get page', { error });
      throw error;
    }
  }

  public async createPage(req: RequestWithUser, res: Response) {
    try {
      const page = await this.service.createPage({
        ...req.body,
        userId: req.user.id
      });
      
      // Send WebSocket notification
      this.wsService.sendToUser(req.user.id, 'ai:message', {
        id: uuidv4(),
        content: `Created new page: ${page.name}`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'crud',
          source: {
            page: 'CRUD Pages',
            controller: 'CrudPagesController',
            action: 'createPage',
            details: { page }
          },
          timestamp: new Date().toISOString()
        }
      });

      res.status(201).json(page);
    } catch (error) {
      logger.error('Failed to create page', { error });
      throw error;
    }
  }

  public async updatePage(req: RequestWithUser, res: Response) {
    try {
      const page = await this.service.updatePage(req.params.id, req.user.id, req.body);
      
      // Send WebSocket notification
      this.wsService.sendToUser(req.user.id, 'ai:message', {
        id: uuidv4(),
        content: `Updated page: ${page.name}`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'crud',
          source: {
            page: 'CRUD Pages',
            controller: 'CrudPagesController',
            action: 'updatePage',
            details: { page }
          },
          timestamp: new Date().toISOString()
        }
      });

      res.json(page);
    } catch (error) {
      logger.error('Failed to update page', { error });
      throw error;
    }
  }

  public async deletePage(req: RequestWithUser, res: Response) {
    try {
      await this.service.deletePage(req.params.id, req.user.id);
      
      // Send WebSocket notification
      this.wsService.sendToUser(req.user.id, 'ai:message', {
        id: uuidv4(),
        content: `Deleted page`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'crud',
          source: {
            page: 'CRUD Pages',
            controller: 'CrudPagesController',
            action: 'deletePage',
            details: { pageId: req.params.id }
          },
          timestamp: new Date().toISOString()
        }
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete page', { error });
      throw error;
    }
  }

  public async createData(req: RequestWithUser, res: Response) {
    try {
      const pageId = req.params.pageId;
      const data = await this.service.createData(pageId, req.user.id, req.body);
      
      // Send WebSocket notification
      this.wsService.sendToUser(req.user.id, 'ai:message', {
        id: uuidv4(),
        content: `Created new record in page ${pageId}`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'crud',
          source: {
            page: 'CRUD Pages',
            controller: 'CrudPagesController',
            action: 'createData',
            details: { pageId, dataId: data.id }
          },
          timestamp: new Date().toISOString()
        }
      });

      res.status(201).json(data);
    } catch (error) {
      logger.error('Failed to create data', { error });
      throw error;
    }
  }

  public async getData(req: RequestWithUser, res: Response) {
    try {
      const data = await this.service.getData(req.params.id, req.user.id);
      res.json(data);
    } catch (error) {
      logger.error('Failed to get data', { error });
      throw error;
    }
  }

  public async updateData(req: RequestWithUser, res: Response) {
    try {
      const { pageId, id } = req.params;
      const data = await this.service.updateData(pageId, id, req.user.id, req.body);
      
      // Send WebSocket notification
      this.wsService.sendToUser(req.user.id, 'ai:message', {
        id: uuidv4(),
        content: `Updated record in page ${pageId}`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'crud',
          source: {
            page: 'CRUD Pages',
            controller: 'CrudPagesController',
            action: 'updateData',
            details: { pageId, dataId: id }
          },
          timestamp: new Date().toISOString()
        }
      });

      res.json(data);
    } catch (error) {
      logger.error('Failed to update data', { error });
      throw error;
    }
  }

  public async deleteData(req: RequestWithUser, res: Response) {
    try {
      const { pageId, id } = req.params;
      await this.service.deleteData(pageId, id, req.user.id);
      
      // Send WebSocket notification
      this.wsService.sendToUser(req.user.id, 'ai:message', {
        id: uuidv4(),
        content: `Deleted record from page ${pageId}`,
        role: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'notification',
          status: 'success',
          category: 'crud',
          source: {
            page: 'CRUD Pages',
            controller: 'CrudPagesController',
            action: 'deleteData',
            details: { pageId, dataId: id }
          },
          timestamp: new Date().toISOString()
        }
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete data', { error });
      throw error;
    }
  }
} 