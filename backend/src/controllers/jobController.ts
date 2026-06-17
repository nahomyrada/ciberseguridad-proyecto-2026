import { Request, Response } from 'express';
import { JobOfferModel } from '../models/JobOffer';
import { MatchingService } from '../services/matchingService';

// GET /api/jobs
export const getAllJobs = async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const jobs = await JobOfferModel.findAll(limit, offset);

        // Calcular match scores para el usuario actual
        const rankedJobs = await MatchingService.rankJobsForUser(req.userId!, jobs);

        res.json({ success: true, data: rankedJobs, count: rankedJobs.length });
    } catch (error) {
        console.error('Error en getAllJobs:', error);
        res.status(500).json({ success: false, message: 'Error al obtener ofertas' });
    }
};

// GET /api/jobs/pending
export const getPendingJobs = async (req: Request, res: Response): Promise<void> => {
    try {
        const jobs = await JobOfferModel.findPending();

        // Calcular match scores para el usuario actual
        const rankedJobs = await MatchingService.rankJobsForUser(req.userId!, jobs);

        res.json({ success: true, data: rankedJobs, count: rankedJobs.length });
    } catch (error) {
        console.error('Error en getPendingJobs:', error);
        res.status(500).json({ success: false, message: 'Error al obtener ofertas pendientes' });
    }
};

// GET /api/jobs/:id
export const getJobById = async (req: Request, res: Response): Promise<void> => {
    try {
        const job = await JobOfferModel.findById(parseInt(req.params.id));
        if (!job) {
            res.status(404).json({ success: false, message: 'Oferta no encontrada' });
            return;
        }
        res.json({ success: true, data: job });
    } catch (error) {
        console.error('Error en getJobById:', error);
        res.status(500).json({ success: false, message: 'Error al obtener oferta' });
    }
};

// POST /api/jobs
export const createJob = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, url } = req.body;
        if (!title || !url) {
            res.status(400).json({ success: false, message: 'title y url son requeridos' });
            return;
        }
        const job = await JobOfferModel.create(req.body);
        res.status(201).json({ success: true, data: job });
    } catch (error: unknown) {
        console.error('Error en createJob:', error);
        if ((error as { code?: string }).code === '23505') {
            res.status(409).json({ success: false, message: 'La URL ya existe en la base de datos' });
            return;
        }
        res.status(500).json({ success: false, message: 'Error al crear oferta' });
    }
};

// PATCH /api/jobs/:id/relevance
export const setRelevance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { is_relevant } = req.body;
        if (typeof is_relevant !== 'boolean') {
            res.status(400).json({ success: false, message: 'is_relevant debe ser booleano' });
            return;
        }
        const job = await JobOfferModel.update(parseInt(req.params.id), { is_relevant });
        if (!job) {
            res.status(404).json({ success: false, message: 'Oferta no encontrada' });
            return;
        }
        res.json({ success: true, data: job });
    } catch (error) {
        console.error('Error en setRelevance:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar relevancia' });
    }
};

// DELETE /api/jobs/:id
export const deleteJob = async (req: Request, res: Response): Promise<void> => {
    try {
        const deleted = await JobOfferModel.delete(parseInt(req.params.id));
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Oferta no encontrada' });
            return;
        }
        res.json({ success: true, message: 'Oferta eliminada' });
    } catch (error) {
        console.error('Error en deleteJob:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar oferta' });
    }
};
