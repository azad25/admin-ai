import { Router } from 'express';
import { CrudPagesController } from '../controllers/crudPages.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { WebSocketService } from '../services/websocket.service';

export function createCrudRoutes(wsService: WebSocketService) {
  const router = Router();
  const controller = new CrudPagesController(wsService);

  // CRUD Page routes
  router.get('/pages', asyncHandler(controller.getPages));
  router.get('/pages/:id', asyncHandler(controller.getPage));
  router.post('/pages', asyncHandler(controller.createPage));
  router.put('/pages/:id', asyncHandler(controller.updatePage));
  router.delete('/pages/:id', asyncHandler(controller.deletePage));

  // CRUD Data routes
  router.get('/data/:pageId', asyncHandler(controller.getData));
  router.post('/data/:pageId', asyncHandler(controller.createData));
  router.put('/data/:pageId/:id', asyncHandler(controller.updateData));
  router.delete('/data/:pageId/:id', asyncHandler(controller.deleteData));

  return router;
} 