/**
 * CONTROLADOR VULNERABLE PARA DEMOSTRACIÓN EDUCATIVA - CVE-2025-59528
 * ⚠️ SOLO PARA FINES ACADÉMICOS EN AMBIENTE CONTROLADO ⚠️
 * 
 * Este controlador contiene DOS vulnerabilidades críticas:
 * 1. Information Leak en reset de contraseña
 * 2. RCE mediante eval() en endpoint de configuración MCP
 */

import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// ============================================
// VERSIÓN VULNERABLE - DEMOSTRACIÓN DE ATAQUE
// ============================================

/**
 * ENDPOINT 1: POST /api/auth/forgot-password (VULNERABLE)
 * 
 * VULNERABILIDAD: Retorna el token de reset en el response body
 * Permite Account Takeover sin acceso al email
 * 
 * CWE-200: Exposure of Sensitive Information
 */
export const forgotPasswordVulnerable = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ 
                success: false, 
                message: 'Email es requerido' 
            });
            return;
        }

        // Buscar usuario en la base de datos real
        const user = await UserModel.findByEmail(email);
        
        // Simular generación de token (similar a cómo se haría en producción)
        const tempToken = crypto.randomBytes(32).toString('hex') + 
                         Date.now().toString(36);
        
        // 🔴 VULNERABILIDAD CRÍTICA #1: El token se devuelve en la respuesta HTTP
        // Un atacante puede interceptar/modificar la respuesta o leerla desde el cliente
        console.log(`[VULNERABLE] Token generado para ${email}: ${tempToken}`);
        
        // En un sistema real, aquí se enviaría un email con el token
        // Pero en este endpoint VULNERABLE, lo EXPONEMOS directamente
        
        res.status(200).json({
            success: true,
            message: 'Token de restablecimiento generado',
            // 🔴 DATOS EXPUESTOS QUE PERMITEN EL ATAQUE:
            resetToken: tempToken,  // ← FILTRACIÓN DE INFORMACIÓN CRÍTICA
            email: email,
            userId: user?.id || null,
            // Metadata que ayuda al atacante
            resetEndpoint: '/api/auth/reset-password',
            tokenExpiresIn: '1 hora'
        });
        
    } catch (error) {
        console.error('Error en forgot-password (vulnerable):', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al procesar la solicitud' 
        });
    }
};

/**
 * ENDPOINT 2: POST /api/node-load-method/customMCP (VULNERABLE)
 * 
 * VULNERABILIDAD: Usa eval() para ejecutar código JavaScript arbitrario
 * Permite RCE (Remote Code Execution) en el servidor
 * 
 * Contexto educativo: Simula un servidor MCP (Model Context Protocol)
 * que permite cargar configuraciones personalizadas
 * 
 * CWE-94: Improper Control of Generation of Code ('Code Injection')
 */
export const customMCPVulnerable = async (req: Request, res: Response): Promise<void> => {
    try {
        const { inputs } = req.body;
        
        if (!inputs || !inputs.mcpServerConfig) {
            res.status(400).json({ 
                success: false, 
                error: 'Se requiere inputs.mcpServerConfig',
                requiredFormat: {
                    inputs: {
                        mcpServerConfig: 'string (JSON o código JavaScript)'
                    }
                }
            });
            return;
        }
        
        const configString = inputs.mcpServerConfig;
        
        console.log('[VULNERABLE] Procesando configuración MCP:', configString);
        console.log('[VULNERABLE] Contexto de ejecución - Usuario:', 
                    process.env.USER || process.env.USERNAME || 'engineer');
        
        // 🔴 VULNERABILIDAD CRÍTICA #2: eval() ejecuta código arbitrario
        // Esto permite inyección de código malicioso como:
        // "'; require('child_process').exec('whoami', (e,o)=>console.log(o)); //"
        // 
        // El atacante puede ejecutar CUALQUIER comando del sistema operativo
        // bajo el usuario que ejecuta la aplicación (engineer)
        
        let processedConfig;
        try {
            // 🔴 USO PELIGROSO DE eval() - NUNCA HACER ESTO EN PRODUCCIÓN
            processedConfig = eval(`(${configString})`);
        } catch (evalError: any) {
            // El error ya revela información interna
            res.status(400).json({
                success: false,
                error: 'Error evaluando configuración',
                details: evalError.message,
                // ⚠️ Esto ya revela información sensible
            });
            return;
        }
        
        // Simular que la configuración se aplica exitosamente
        res.status(200).json({
            success: true,
            message: 'Configuración MCP aplicada correctamente',
            appliedConfig: processedConfig,
            // 🎯 Metadata que el atacante puede usar para reconocimiento:
            executionContext: {
                user: process.env.USER || process.env.USERNAME || 'unknown',
                nodeVersion: process.version,
                platform: process.platform,
                cwd: process.cwd(),
                env: {
                    NODE_ENV: process.env.NODE_ENV,
                    // No exponemos todas las variables por seguridad del lab
                }
            },
            serverInfo: {
                hostname: require('os').hostname(),
                uptime: process.uptime()
            }
        });
        
    } catch (error: any) {
        console.error('[VULNERABLE] Error en customMCP:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
};

// ============================================
// VERSIÓN PARCHEADA - CÓDIGO SEGURO
// ============================================

/**
 * ENDPOINT 1 PARCHADO: POST /api/auth/forgot-password (SEGURO)
 * 
 * CORRECCIÓN APLICADA:
 * - El token NO se devuelve en la respuesta HTTP
 * - Se almacena el token hasheado en la base de datos
 * - Respuesta genérica sin revelar existencia del usuario
 * - El token se enviaría por email (canal seguro)
 */
/*
export const forgotPasswordPatched = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ 
                success: false, 
                message: 'Email es requerido' 
            });
            return;
        }

        // Buscar usuario
        const user = await UserModel.findByEmail(email);
        
        // ✅ CORRECCIÓN: Respuesta genérica para evitar user enumeration
        if (!user) {
            // Respondemos igual aunque el usuario no exista
            res.status(200).json({ 
                success: true, 
                message: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña'
            });
            return;
        }
        
        // Generar token criptográficamente seguro
        const tempToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 3600000); // 1 hora
        
        // ✅ CORRECCIÓN: Hash del token antes de almacenar
        const hashedToken = crypto.createHash('sha256').update(tempToken).digest('hex');
        
        // Aquí almacenarías el token hasheado en la tabla password_resets
        // await PasswordResetModel.create(user.id, hashedToken, tokenExpiry);
        
        // Simular envío de email (en producción aquí iría el envío real)
        console.log(`[SEGURO] Token de reset para ${email}: ${tempToken}`);
        console.log(`[SEGURO] Token hasheado almacenado: ${hashedToken}`);
        console.log(`[SEGURO] El token debería enviarse por email, no por HTTP`);
        
        // ✅ CORRECCIÓN: NO incluimos el token en la respuesta HTTP
        res.status(200).json({
            success: true,
            message: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña'
            // El token NUNCA está presente en la respuesta
        });
        
    } catch (error) {
        console.error('Error en forgot-password (seguro):', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al procesar la solicitud' 
        });
    }
};*/

/**
 * ENDPOINT 2 PARCHADO: POST /api/node-load-method/customMCP (SEGURO)
 * 
 * CORRECCIÓN APLICADA:
 * - NO se usa eval() NUNCA
 * - Se usa JSON.parse() para parseo estático
 * - Validación de esquema estricta
 * - Sanitización de entrada
 */
/*
export const customMCPPatched = async (req: Request, res: Response): Promise<void> => {
    try {
        const { inputs } = req.body;
        
        // ✅ CORRECCIÓN 1: Validación de estructura
        if (!inputs || typeof inputs !== 'object') {
            res.status(400).json({ 
                success: false, 
                error: 'Formato inválido: se requiere objeto "inputs"' 
            });
            return;
        }
        
        if (!inputs.mcpServerConfig || typeof inputs.mcpServerConfig !== 'string') {
            res.status(400).json({ 
                success: false, 
                error: 'inputs.mcpServerConfig debe ser un string' 
            });
            return;
        }
        
        const configString = inputs.mcpServerConfig;
        
        console.log('[SEGURO] Procesando configuración MCP con parser seguro');
        
        // ✅ CORRECCIÓN 2: Usar JSON.parse() en lugar de eval()
        // JSON.parse SOLO parsea JSON, NO ejecuta código JavaScript
        let parsedConfig;
        try {
            parsedConfig = JSON.parse(configString);
        } catch (parseError: any) {
            res.status(400).json({ 
                success: false, 
                error: 'Formato JSON inválido. Use un objeto JSON válido.' 
            });
            return;
        }
        
        // ✅ CORRECCIÓN 3: Validar esquema de configuración
        // Definir estructura permitida
        const allowedConfigSchema = {
            serverName: { type: 'string', required: true, maxLength: 100 },
            port: { type: 'number', required: true, min: 1024, max: 65535 },
            protocol: { type: 'string', required: true, enum: ['http', 'https', 'ws', 'wss'] },
            timeout: { type: 'number', required: false, min: 1000, max: 30000 },
            retryAttempts: { type: 'number', required: false, min: 0, max: 10 }
        };
        
        // Validar campos requeridos
        for (const [field, rules] of Object.entries(allowedConfigSchema)) {
            if (rules.required && !parsedConfig[field]) {
                res.status(400).json({
                    success: false,
                    error: `Campo requerido faltante: ${field}`
                });
                return;
            }
        }
        
        // Validar tipos y valores
        if (parsedConfig.serverName && parsedConfig.serverName.length > 100) {
            res.status(400).json({
                success: false,
                error: 'serverName excede longitud máxima de 100 caracteres'
            });
            return;
        }
        
        if (parsedConfig.port && (parsedConfig.port < 1024 || parsedConfig.port > 65535)) {
            res.status(400).json({
                success: false,
                error: 'port debe estar entre 1024 y 65535'
            });
            return;
        }
        
        if (parsedConfig.protocol && 
            !['http', 'https', 'ws', 'wss'].includes(parsedConfig.protocol)) {
            res.status(400).json({
                success: false,
                error: 'protocol debe ser http, https, ws o wss'
            });
            return;
        }
        
        // ✅ CORRECCIÓN 4: Configuración segura aplicada
        const appliedConfig = {
            ...parsedConfig,
            _secured: true,
            _validatedAt: new Date().toISOString(),
            _validatedBy: 'secure-parser-v1'
        };
        
        res.status(200).json({
            success: true,
            message: 'Configuración MCP validada y aplicada correctamente',
            appliedConfig: appliedConfig
            // ✅ No se revela información del sistema
        });
        
    } catch (error: any) {
        console.error('[SEGURO] Error en customMCP:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno procesando la configuración' 
        });
    }
};*/

/**
 * Endpoint de reset de contraseña (implementación segura de referencia)
 * POST /api/auth/reset-password
 * 
 * Este endpoint es el que USARÍA el token enviado por email
 * No contiene vulnerabilidades
 */

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, email, newPassword } = req.body;
        
        if (!token || !email || !newPassword) {
            res.status(400).json({ 
                success: false, 
                message: 'Token, email y nueva contraseña son requeridos' 
            });
            return;
        }
        
        if (newPassword.length < 8) {
            res.status(400).json({ 
                success: false, 
                message: 'La contraseña debe tener al menos 8 caracteres' 
            });
            return;
        }
        
        // Acepta CUALQUIER token (para demostración)
        console.log(`[RESET] Token recibido: ${token}`);
        console.log(`[RESET] Email: ${email}`);
        console.log(`[RESET] Nueva contraseña: ${newPassword}`);
        
        // Buscar al usuario por email
        const user = await UserModel.findByEmail(email);
        if (!user) {
            res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
            return;
        }
        
        // Generar hash de la nueva contraseña
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        
        // Actualizar la contraseña
        const updatedUser = await UserModel.update(user.id, { 
            password_hash: newPasswordHash 
        });
        
        if (!updatedUser) {
            res.status(500).json({ 
                success: false, 
                message: 'Error al actualizar la contraseña' 
            });
            return;
        }
        
        console.log(`[RESET] Contraseña actualizada para: ${email}`);
        
        res.status(200).json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
        
    } catch (error) {
        console.error('Error en reset-password:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al restablecer la contraseña' 
        });
    }
};