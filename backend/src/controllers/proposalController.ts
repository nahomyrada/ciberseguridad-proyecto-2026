import { Request, Response } from 'express';
import { ProposalModel } from '../models/Proposal';
import { JobOfferModel } from '../models/JobOffer';
import { SkillModel } from '../models/Skill';
import { AIService } from '../services/aiService';

// GET /api/proposals
export const getAllProposals = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status } = req.query;
        // [BLUE] Fix IDOR (A01:2025): solo se devuelven las propuestas del usuario autenticado.
        const proposals = await ProposalModel.findAllByUser(req.userId!, status as string | undefined);
        res.json({ success: true, data: proposals, count: proposals.length });
    } catch (error) {
        console.error('Error en getAllProposals:', error);
        res.status(500).json({ success: false, message: 'Error al obtener propuestas' });
    }
};

// GET /api/proposals/:id
export const getProposalById = async (req: Request, res: Response): Promise<void> => {
    try {
        const proposal = await ProposalModel.findById(parseInt(req.params.id));
        // [BLUE] Fix IDOR (A01:2025): si no existe o no pertenece al usuario, se responde
        // 404 genérico para no revelar la existencia del recurso (anti-enumeración).
        if (!proposal || proposal.user_id !== req.userId) {
            res.status(404).json({ success: false, message: 'Propuesta no encontrada' });
            return;
        }
        res.json({ success: true, data: proposal });
    } catch (error) {
        console.error('Error en getProposalById:', error);
        res.status(500).json({ success: false, message: 'Error al obtener propuesta' });
    }
};

// POST /api/proposals
export const createProposal = async (req: Request, res: Response): Promise<void> => {
    try {
        const { job_offer_id, content, generated_content } = req.body;

        if (!job_offer_id) {
            res.status(400).json({ success: false, message: 'job_offer_id es requerido' });
            return;
        }

        // Evitar duplicados
        const existing = await ProposalModel.findByJobOffer(job_offer_id);
        if (existing) {
            res.status(400).json({
                success: false,
                message: 'Ya existe una propuesta para esta oferta. Por favor, edítala desde la sección de Propuestas.'
            });
            return;
        }

        // Mapear 'content' (frontend) a 'generated_content' (backend model) si es necesario
        // [BLUE] Fix IDOR: el propietario se fija desde el token JWT, no desde el cliente
        // (se ignora cualquier user_id enviado en el body para evitar Mass Assignment).
        const proposalData = {
            ...req.body,
            user_id: req.userId,
            generated_content: generated_content || content
        };

        const proposal = await ProposalModel.create(proposalData);
        res.status(201).json({ success: true, data: proposal });
    } catch (error) {
        console.error('Error en createProposal:', error);
        res.status(500).json({ success: false, message: 'Error al crear propuesta' });
    }
};

// PATCH /api/proposals/:id/status
export const updateProposalStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending_review', 'approved', 'rejected', 'sent'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ success: false, message: `Status inválido. Debe ser: ${validStatuses.join(', ')}` });
            return;
        }
        const id = parseInt(req.params.id);
        // [BLUE] Fix IDOR (A01:2025): validar propiedad ANTES de modificar el recurso.
        const existing = await ProposalModel.findById(id);
        if (!existing || existing.user_id !== req.userId) {
            res.status(404).json({ success: false, message: 'Propuesta no encontrada' });
            return;
        }
        const proposal = await ProposalModel.updateStatus(id, status);
        if (!proposal) {
            res.status(404).json({ success: false, message: 'Propuesta no encontrada' });
            return;
        }
        res.json({ success: true, data: proposal });
    } catch (error) {
        console.error('Error en updateProposalStatus:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar estado' });
    }
};

// DELETE /api/proposals/:id
export const deleteProposal = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        // [BLUE] Fix IDOR (A01:2025): validar propiedad ANTES de eliminar el recurso.
        const existing = await ProposalModel.findById(id);
        if (!existing || existing.user_id !== req.userId) {
            res.status(404).json({ success: false, message: 'Propuesta no encontrada' });
            return;
        }
        const deleted = await ProposalModel.delete(id);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Propuesta no encontrada' });
            return;
        }
        res.json({ success: true, message: 'Propuesta eliminada' });
    } catch (error) {
        console.error('Error en deleteProposal:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar propuesta' });
    }
};

// PATCH /api/proposals/:id
export const updateProposal = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        // [BLUE] Fix IDOR (A01:2025): validar propiedad ANTES de actualizar el recurso.
        const existing = await ProposalModel.findById(id);
        if (!existing || existing.user_id !== req.userId) {
            res.status(404).json({ success: false, message: 'Propuesta no encontrada' });
            return;
        }
        // [BLUE] Anti Mass Assignment: el cliente no puede reasignar el propietario.
        const { user_id, ...safeData } = req.body;
        const proposal = await ProposalModel.update(id, safeData);
        if (!proposal) {
            res.status(404).json({ success: false, message: 'Propuesta no encontrada' });
            return;
        }
        res.json({ success: true, data: proposal });
    } catch (error) {
        console.error('Error en updateProposal:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar propuesta' });
    }
};

// POST /api/proposals/generate
export const generateAIProposal = async (req: Request, res: Response): Promise<void> => {
    try {
        const { job_offer_id, jobData } = req.body;

        let job = null;

        if (job_offer_id) {
            job = await JobOfferModel.findById(job_offer_id);
        }

        // Si no se encontró por ID pero tenemos jobData (de una oferta volátil)
        if (!job && jobData) {
            // Verificar si ya existe por external_id para no duplicar
            if (jobData.external_id) {
                job = await JobOfferModel.findByExternalId(jobData.external_id);
            }

            // Si sigue siendo null, crear la oferta en la DB
            if (!job) {
                job = await JobOfferModel.create({
                    ...jobData,
                    platform_id: jobData.platform_id || 1, // Default Freelancer
                });
            }
        }

        if (!job) {
            res.status(404).json({ success: false, message: 'Oferta de trabajo no encontrada o datos insuficientes' });
            return;
        }

        const userSkills = await SkillModel.findByUser(req.userId!);
        const generatedContent = await AIService.generateProposal(job, userSkills);

        res.json({
            success: true,
            data: {
                content: generatedContent,
                job_id: job.id // Devolvemos el ID real de la DB para que el frontend lo use al guardar la propuesta
            }
        });
    } catch (error: any) {
        console.error('Error en generateAIProposal:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al generar propuesta con IA'
        });
    }
};
