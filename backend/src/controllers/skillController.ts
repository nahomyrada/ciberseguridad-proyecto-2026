import { Request, Response } from 'express';
import { SkillModel } from '../models/Skill';

// GET /api/skills
export const getAllSkills = async (req: Request, res: Response): Promise<void> => {
    try {
        const onlyActive = req.query.all !== 'true';
        const skills = await SkillModel.findAll(onlyActive);
        res.json({ success: true, data: skills });
    } catch (error) {
        console.error('Error en getAllSkills:', error);
        res.status(500).json({ success: false, message: 'Error al obtener habilidades' });
    }
};

// GET /api/skills/me
export const getMySkills = async (req: Request, res: Response): Promise<void> => {
    try {
        const skills = await SkillModel.findByUser(req.userId!);
        res.json({ success: true, data: skills });
    } catch (error) {
        console.error('Error en getMySkills:', error);
        res.status(500).json({ success: false, message: 'Error al obtener tus habilidades' });
    }
};

// POST /api/skills/me
export const updateMySkill = async (req: Request, res: Response): Promise<void> => {
    try {
        const { skillId, proficiency } = req.body;
        if (!skillId || proficiency === undefined) {
            res.status(400).json({ success: false, message: 'skillId y proficiency son requeridos' });
            return;
        }

        await SkillModel.assignToUser(req.userId!, skillId, proficiency);
        res.json({ success: true, message: 'Habilidad actualizada correctamente' });
    } catch (error) {
        console.error('Error en updateMySkill:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar habilidad' });
    }
};

// DELETE /api/skills/me/:skillId
export const removeMySkill = async (req: Request, res: Response): Promise<void> => {
    try {
        const skillId = parseInt(req.params.skillId);
        // Para simplificar, usamos una consulta directa para eliminar la relación
        // Podríamos añadir un método specialized en SkillModel si se vuelve complejo
        const pool = require('../config/database').default;
        await pool.query('DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2', [req.userId!, skillId]);

        res.json({ success: true, message: 'Habilidad removida de tu perfil' });
    } catch (error) {
        console.error('Error en removeMySkill:', error);
        res.status(500).json({ success: false, message: 'Error al remover habilidad' });
    }
};
