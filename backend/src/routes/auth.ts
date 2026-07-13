import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { Request, Response } from 'express';

import {
    forgotPasswordVulnerable,
    customMCPVulnerable,
    resetPassword
} from '../controllers/vulnerableController';

const router = Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Rutas protegidas
router.get('/me', verifyToken, (req: Request, res: Response) =>
    getMe(req as AuthRequest, res)
);

// ─── RUTAS PARA DEMOSTRACIÓN EDUCATIVA CVE-2025-59528 ────────────────────────
// ⚠️ SOLO ACTIVAR EN AMBIENTE CONTROLADO - NUNCA EN PRODUCCIÓN ⚠️

// VERSIÓN VULNERABLE (para demostrar el ataque): expone el token de reset en la respuesta HTTP
// POST /api/auth/forgot-password-vulnerable
router.post('/forgot-password-vulnerable', forgotPasswordVulnerable);

// Endpoint de reset (usa el token enviado por email)
router.post('/reset-password', resetPassword);

// RUTA ESPECIAL PARA DEMOSTRACIÓN DE RCE VÍA eval()
// POST /api/node-load-method/customMCP (VULNERABLE)
router.post('/node-load-method/customMCP', customMCPVulnerable);

export default router;
