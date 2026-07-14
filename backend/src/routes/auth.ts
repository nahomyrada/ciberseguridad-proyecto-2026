import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { Request, Response } from 'express';

const router = Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Rutas protegidas
router.get('/me', verifyToken, (req: Request, res: Response) =>
    getMe(req as AuthRequest, res)
);

export default router;
