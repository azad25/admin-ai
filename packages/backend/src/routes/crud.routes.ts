import { Router } from 'express';
import { CrudPagesController } from '../controllers/crudPages.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { WebSocketService } from '../services/websocket.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { CreateCrudPageSchema } from '../schemas/crudPage.schema';

export function createCrudRoutes(wsService: WebSocketService) {
  const router = Router();
  const controller = new CrudPagesController(wsService);

  // Apply auth middleware to all routes
  router.use(authMiddleware.requireAuth);

  // CRUD Page routes
  router.post('/pages', 
    validateRequest({ body: CreateCrudPageSchema }),
    asyncHandler(controller.createPage)
  );
  
  router.get('/pages', 
    asyncHandler(controller.getPages)
  );
  
  router.get('/pages/:id', 
    asyncHandler(controller.getPage)
  );
  
  router.put('/pages/:id', 
    validateRequest({ body: CreateCrudPageSchema.partial() }),
    asyncHandler(controller.updatePage)
  );
  
  router.delete('/pages/:id', 
    asyncHandler(controller.deletePage)
  );

  // CRUD Data routes - nested under pages
  router.post('/pages/:id/data', 
    asyncHandler(controller.createData)
  );
  
  router.get('/pages/:id/data', 
    asyncHandler(controller.getData)
  );
  
  router.put('/pages/:id/data/:dataId', 
    asyncHandler(controller.updateData)
  );
  
  router.delete('/pages/:id/data/:dataId', 
    asyncHandler(controller.deleteData)
  );

  return router;
} 