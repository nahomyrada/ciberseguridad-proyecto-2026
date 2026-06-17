import { Request, Response } from 'express';
import { PlatformModel } from '../models/Platform';

// GET /api/platforms
export const getAllPlatforms = async (_req: Request, res: Response): Promise<void> => {
    try {
        const platforms = await PlatformModel.findAll();
        res.json({ success: true, data: platforms });
    } catch (error) {
        console.error('Error en getAllPlatforms:', error);
        res.status(500).json({ success: false, message: 'Error al obtener plataformas' });
    }
};

// GET /api/platforms/:id
export const getPlatformById = async (req: Request, res: Response): Promise<void> => {
    try {
        const platform = await PlatformModel.findById(parseInt(req.params.id));
        if (!platform) {
            res.status(404).json({ success: false, message: 'Plataforma no encontrada' });
            return;
        }
        res.json({ success: true, data: platform });
    } catch (error) {
        console.error('Error en getPlatformById:', error);
        res.status(500).json({ success: false, message: 'Error al obtener plataforma' });
    }
};

// POST /api/platforms
export const createPlatform = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name } = req.body;
        if (!name) {
            res.status(400).json({ success: false, message: 'El nombre es requerido' });
            return;
        }
        const platform = await PlatformModel.create(req.body);
        res.status(201).json({ success: true, data: platform });
    } catch (error) {
        console.error('Error en createPlatform:', error);
        res.status(500).json({ success: false, message: 'Error al crear plataforma' });
    }
};

// PATCH /api/platforms/:id
export const updatePlatform = async (req: Request, res: Response): Promise<void> => {
    try {
        const platform = await PlatformModel.update(parseInt(req.params.id), req.body);
        if (!platform) {
            res.status(404).json({ success: false, message: 'Plataforma no encontrada' });
            return;
        }
        res.json({ success: true, data: platform });
    } catch (error) {
        console.error('Error en updatePlatform:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar plataforma' });
    }
};

// DELETE /api/platforms/:id
export const deletePlatform = async (req: Request, res: Response): Promise<void> => {
    try {
        const deleted = await PlatformModel.delete(parseInt(req.params.id));
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Plataforma no encontrada' });
            return;
        }
        res.json({ success: true, message: 'Plataforma eliminada' });
    } catch (error) {
        console.error('Error en deletePlatform:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar plataforma' });
    }
};
