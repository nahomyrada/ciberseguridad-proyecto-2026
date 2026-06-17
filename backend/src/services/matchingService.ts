import { JobOffer } from '../models/JobOffer';
import { Skill } from '../models/Skill';

export interface MatchResult {
    jobId: number;
    score: number; // 0-100
    matchedSkills: string[];
    missingSkills: string[];
    isRelevant: boolean;
}

export class MatchingService {
    /**
     * Calcula la afinidad entre las habilidades del usuario y los requisitos de un trabajo.
     */
    static async calculateMatch(userSkills: (Skill & { proficiency: number })[], job: JobOffer): Promise<MatchResult> {
        const jobSkills = job.required_skills.map(s => s.toLowerCase());
        const userSkillNames = userSkills.map(s => s.name.toLowerCase());

        const matched = userSkills.filter(s => jobSkills.includes(s.name.toLowerCase()));
        const matchedNames = matched.map(s => s.name);

        const missing = job.required_skills.filter(s => !userSkillNames.includes(s.toLowerCase()));

        // Algoritmo de puntuación simple:
        // 1. Ratio de habilidades encontradas vs requeridas (60% del peso)
        // 2. Nivel promedio de las habilidades encontradas (40% del peso)

        let score = 0;
        if (jobSkills.length > 0) {
            const matchRatio = matched.length / jobSkills.length;
            const avgProficiency = matched.length > 0
                ? matched.reduce((acc, s) => acc + s.proficiency, 0) / (matched.length * 10)
                : 0;

            score = Math.round((matchRatio * 0.6 + avgProficiency * 0.4) * 100);
        } else {
            // Si el trabajo no tiene habilidades requeridas listadas, damos un score base si el usuario tiene algún skill
            score = userSkills.length > 0 ? 50 : 0;
        }

        return {
            jobId: job.id,
            score: Math.min(score, 100),
            matchedSkills: matchedNames,
            missingSkills: missing,
            isRelevant: score >= 60 // Umbral de relevancia configurable
        };
    }

    /**
     * Procesa una lista de trabajos y marca su relevancia basada en el perfil del usuario.
     */
    static async rankJobsForUser(userId: number, jobs: JobOffer[]): Promise<(JobOffer & { match: MatchResult })[]> {
        const { SkillModel } = require('../models/Skill');
        const userSkills = await SkillModel.findByUser(userId);

        const currentJobs = await Promise.all(
            jobs.map(async (job) => {
                const match = await this.calculateMatch(userSkills, job as any);
                return { ...job, match };
            })
        );

        return currentJobs.sort((a, b) => b.match.score - a.match.score);
    }
}
