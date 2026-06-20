import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
): void => {
    // Detalle completo SOLO al log interno del servidor.
    logger.error('Error no manejado', {
        message: err.message,
        stack: err.stack,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
    });

    // Respuesta al cliente: siempre genérica, sin importar el entorno.
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
    });
};

export const notFound = (req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    });
};