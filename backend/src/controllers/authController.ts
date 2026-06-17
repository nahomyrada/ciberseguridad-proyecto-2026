import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';

const generateToken = (user: { id: number; username: string; email: string }): string => {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET as string,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );
};

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body;

        // Validaciones básicas
        if (!username || !email || !password) {
            res.status(400).json({ success: false, message: 'Username, email y password son requeridos' });
            return;
        }
        if (password.length < 8) {
            res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
            return;
        }

        // Verificar duplicados
        const existingEmail = await UserModel.findByEmail(email);
        if (existingEmail) {
            res.status(409).json({ success: false, message: 'El email ya está registrado' });
            return;
        }
        const existingUsername = await UserModel.findByUsername(username);
        if (existingUsername) {
            res.status(409).json({ success: false, message: 'El username ya está en uso' });
            return;
        }

        const user = await UserModel.create({ username, email, password });
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: { id: user.id, username: user.username, email: user.email },
                token,
            },
        });
    } catch (error) {
        console.error('Error en register:', error);
        res.status(500).json({ success: false, message: 'Error al registrar usuario' });
    }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email y password son requeridos' });
            return;
        }

        const user = await UserModel.findByEmail(email);
        if (!user) {
            res.status(401).json({ success: false, message: 'Credenciales inválidas' });
            return;
        }

        const isValid = await UserModel.verifyPassword(password, user.password_hash);
        if (!isValid) {
            res.status(401).json({ success: false, message: 'Credenciales inválidas' });
            return;
        }

        const token = generateToken(user);

        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: { id: user.id, username: user.username, email: user.email },
                token,
            },
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, message: 'Error al iniciar sesión' });
    }
};

// GET /api/auth/me (ruta protegida)
export const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findById(req.userId!);
        if (!user) {
            res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            return;
        }
        res.json({
            success: true,
            data: { id: user.id, username: user.username, email: user.email, created_at: user.created_at },
        });
    } catch (error) {
        console.error('Error en getMe:', error);
        res.status(500).json({ success: false, message: 'Error al obtener perfil' });
    }
};
