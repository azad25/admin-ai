import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  const protocol = req.secure ? 'https' : 'http';
  const host = req.get('host') || 'localhost:3000';
  const port = process.env.PORT || 3000;

  res.json({
    wsPort: port,
    wsPath: process.env.WS_PATH || '/socket.io',
    apiUrl: `${protocol}://${host}/api`,
    wsHost: host.split(':')[0],
    secure: req.secure
  });
});

export default router; 