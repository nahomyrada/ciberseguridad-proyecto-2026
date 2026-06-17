import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    userId?: number;
    username?: string;
}

interface JwtPayload {
    id: number;
    username: string;
    email: string;
}

export const verifyToken = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({ success: false, message: 'Token de acceso requerido' });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET as string;
        const decoded = jwt.verify(token, secret) as JwtPayload;
        req.userId = decoded.id;
        req.username = decoded.username;
        next();
    } catch (error) {
        res.status(403).json({ success: false, message: 'Token inválido o expirado' });
    }
};
