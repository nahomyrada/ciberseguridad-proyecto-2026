/**
 * [BLUE] Contramedidas para las vulnerabilidades adicionales (fuera del alcance
 * obligatorio del anteproyecto) detectadas en version-vulnerable:
 *   1. Information Leak en reset de contraseña (CWE-200)
 *   2. RCE vía eval() en el endpoint de configuración MCP (CWE-94)
 */
import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { PasswordResetModel } from '../models/PasswordReset';

// POST /api/auth/forgot-password (SEGURO)
// Corrige CWE-200: el token nunca viaja en la respuesta HTTP. Solo se
// almacena su hash (SHA-256) con expiración, y la respuesta es genérica
// para no filtrar si el email existe (anti user-enumeration).
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, message: 'Email es requerido' });
            return;
        }

        const user = await UserModel.findByEmail(email);
        if (user) {
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

            await PasswordResetModel.create(user.id, tokenHash, expiresAt);

            // En producción esto se envía por email. Para la demo del laboratorio
            // se registra solo en el log del servidor (nunca en la respuesta HTTP).
            console.log(`[SEGURO] Token de reset (canal interno/email) para ${email}: ${rawToken}`);
        }

        // Misma respuesta exista o no el usuario: evita enumeración de cuentas.
        res.status(200).json({
            success: true,
            message: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña',
        });
    } catch (error) {
        console.error('Error en forgotPassword:', error);
        res.status(500).json({ success: false, message: 'Error al procesar la solicitud' });
    }
};

// POST /api/auth/reset-password (SEGURO)
// Corrige la aceptación de "cualquier token" de la versión vulnerable:
// valida el hash del token contra el almacenado, su expiración y que
// pertenezca al email indicado, y lo invalida tras un solo uso.
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, email, newPassword } = req.body;
        if (!token || !email || !newPassword) {
            res.status(400).json({ success: false, message: 'Token, email y nueva contraseña son requeridos' });
            return;
        }
        if (newPassword.length < 8) {
            res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
            return;
        }

        const user = await UserModel.findByEmail(email);
        if (!user) {
            res.status(400).json({ success: false, message: 'Token inválido o expirado' });
            return;
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const reset = await PasswordResetModel.findValid(user.id, tokenHash);
        if (!reset) {
            res.status(400).json({ success: false, message: 'Token inválido o expirado' });
            return;
        }

        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        await UserModel.update(user.id, { password_hash: newPasswordHash });
        await PasswordResetModel.markUsed(reset.id);

        res.status(200).json({ success: true, message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ success: false, message: 'Error al restablecer la contraseña' });
    }
};

// Esquema estricto de configuración MCP permitida (allowlist de campos).
const ALLOWED_MCP_CONFIG: Record<string, { type: 'string' | 'number'; required: boolean; enum?: string[] }> = {
    serverName: { type: 'string', required: true },
    port: { type: 'number', required: true },
    protocol: { type: 'string', required: true, enum: ['http', 'https', 'ws', 'wss'] },
    timeout: { type: 'number', required: false },
};

// POST /api/auth/node-load-method/customMCP (SEGURO)
// Corrige CWE-94: reemplaza eval() por JSON.parse() (parseo estático, sin
// ejecución de código) más validación estricta de esquema.
export const customMCPConfig = async (req: Request, res: Response): Promise<void> => {
    try {
        const { inputs } = req.body;
        if (!inputs || typeof inputs.mcpServerConfig !== 'string') {
            res.status(400).json({ success: false, error: 'inputs.mcpServerConfig debe ser un string JSON' });
            return;
        }

        let parsedConfig: Record<string, unknown>;
        try {
            // ✅ JSON.parse SOLO interpreta datos, nunca ejecuta código.
            parsedConfig = JSON.parse(inputs.mcpServerConfig);
        } catch {
            res.status(400).json({ success: false, error: 'Formato JSON inválido' });
            return;
        }

        for (const [field, rules] of Object.entries(ALLOWED_MCP_CONFIG)) {
            const value = parsedConfig[field];
            if (rules.required && value === undefined) {
                res.status(400).json({ success: false, error: `Campo requerido faltante: ${field}` });
                return;
            }
            if (value !== undefined && typeof value !== rules.type) {
                res.status(400).json({ success: false, error: `Campo ${field} debe ser ${rules.type}` });
                return;
            }
            if (rules.enum && typeof value === 'string' && !rules.enum.includes(value)) {
                res.status(400).json({ success: false, error: `Campo ${field} debe ser uno de: ${rules.enum.join(', ')}` });
                return;
            }
        }

        // Se descarta cualquier campo fuera del allowlist (no se reenvía parsedConfig tal cual).
        const sanitizedConfig = Object.fromEntries(
            Object.keys(ALLOWED_MCP_CONFIG)
                .filter((field) => parsedConfig[field] !== undefined)
                .map((field) => [field, parsedConfig[field]])
        );

        res.status(200).json({
            success: true,
            message: 'Configuración MCP validada y aplicada correctamente',
            appliedConfig: { ...sanitizedConfig, _validatedAt: new Date().toISOString() },
        });
    } catch (error) {
        console.error('Error en customMCPConfig:', error);
        res.status(500).json({ success: false, error: 'Error interno procesando la configuración' });
    }
};
