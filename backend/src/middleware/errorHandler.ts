import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
): void => {
    console.error('💥 Error no manejado:', err.stack);
    // VULNERABLE: expone detalles internos del sistema en cualquier entorno
    res.status(500).json({
        success: false,
        message: err.message,
        error: err.stack,
        details: {
            name: err.name,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        }
    });
};

export const notFound = (req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    });
};
