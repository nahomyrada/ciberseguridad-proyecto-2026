import { Request, Response } from 'express';
import { EarningModel } from '../models/Earning';

// GET /api/earnings
export const getAllEarnings = async (_req: Request, res: Response): Promise<void> => {
    try {
        const earnings = await EarningModel.findAll();
        res.json({ success: true, data: earnings });
    } catch (error) {
        console.error('Error en getAllEarnings:', error);
        res.status(500).json({ success: false, message: 'Error al obtener ganancias' });
    }
};

// GET /api/earnings/summary
export const getMonthlySummary = async (_req: Request, res: Response): Promise<void> => {
    try {
        const summary = await EarningModel.getMonthlySummary();
        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Error en getMonthlySummary:', error);
        res.status(500).json({ success: false, message: 'Error al obtener resumen mensual' });
    }
};

// POST /api/earnings
export const createEarning = async (req: Request, res: Response): Promise<void> => {
    try {
        const { application_id, amount, currency, received_date, platform_fee } = req.body;
        if (!application_id || !amount || !currency || !received_date || platform_fee === undefined) {
            res.status(400).json({
                success: false,
                message: 'application_id, amount, currency, received_date y platform_fee son requeridos',
            });
            return;
        }
        const earning = await EarningModel.create(req.body);
        res.status(201).json({ success: true, data: earning });
    } catch (error) {
        console.error('Error en createEarning:', error);
        res.status(500).json({ success: false, message: 'Error al registrar ganancia' });
    }
};
