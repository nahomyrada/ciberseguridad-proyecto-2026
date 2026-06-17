import { Request, Response } from 'express';
import { ApplicationModel } from '../models/Application';
import { ProposalModel } from '../models/Proposal';

// GET /api/applications
export const getAllApplications = async (_req: Request, res: Response): Promise<void> => {
    try {
        const applications = await ApplicationModel.findAll();
        res.json({ success: true, data: applications, count: applications.length });
    } catch (error) {
        console.error('Error en getAllApplications:', error);
        res.status(500).json({ success: false, message: 'Error al obtener aplicaciones' });
    }
};

// GET /api/applications/:id
export const getApplicationById = async (req: Request, res: Response): Promise<void> => {
    try {
        const application = await ApplicationModel.findById(parseInt(req.params.id));
        if (!application) {
            res.status(404).json({ success: false, message: 'Aplicación no encontrada' });
            return;
        }
        res.json({ success: true, data: application });
    } catch (error) {
        console.error('Error en getApplicationById:', error);
        res.status(500).json({ success: false, message: 'Error al obtener aplicación' });
    }
};

// POST /api/applications
export const createApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        const { proposal_id, notes } = req.body;
        if (!proposal_id) {
            res.status(400).json({ success: false, message: 'proposal_id es requerido' });
            return;
        }

        // Verificar si la propuesta existe
        const proposal = await ProposalModel.findById(proposal_id);
        if (!proposal) {
            res.status(404).json({ success: false, message: 'Propuesta no encontrada' });
            return;
        }

        const application = await ApplicationModel.create(proposal_id, notes);

        // Al crear una aplicación, marcamos la propuesta como 'sent' o 'approved' (opcional)
        // Por ahora lo dejamos manual o según la lógica de negocio que prefiera el usuario.

        res.status(201).json({ success: true, data: application });
    } catch (error) {
        console.error('Error en createApplication:', error);
        res.status(500).json({ success: false, message: 'Error al crear aplicación' });
    }
};

// PATCH /api/applications/:id/status
export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { response_status, notes } = req.body;
        if (!response_status) {
            res.status(400).json({ success: false, message: 'response_status es requerido' });
            return;
        }
        const application = await ApplicationModel.updateResponse(parseInt(req.params.id), response_status, notes);
        if (!application) {
            res.status(404).json({ success: false, message: 'Aplicación no encontrada' });
            return;
        }
        res.json({ success: true, data: application });
    } catch (error) {
        console.error('Error en updateApplicationStatus:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar estado de la aplicación' });
    }
};

// DELETE /api/applications/:id
export const deleteApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        const deleted = await ApplicationModel.delete(parseInt(req.params.id));
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Aplicación no encontrada' });
            return;
        }
        res.json({ success: true, message: 'Aplicación eliminada' });
    } catch (error) {
        console.error('Error en deleteApplication:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar aplicación' });
    }
};
