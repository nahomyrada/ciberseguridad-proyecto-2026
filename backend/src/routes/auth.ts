import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { Request, Response } from 'express';
import { forgotPassword, resetPassword, customMCPConfig } from '../controllers/authExtrasController';

const router = Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// [BLUE] Reemplazan a los endpoints vulnerables de version-vulnerable:
// forgot-password-vulnerable (CWE-200) y node-load-method/customMCP (CWE-94).
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/node-load-method/customMCP', customMCPConfig);

// Rutas protegidas
router.get('/me', verifyToken, (req: Request, res: Response) =>
    getMe(req as AuthRequest, res)
);

export default router;
