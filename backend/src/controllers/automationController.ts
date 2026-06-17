import { Request, Response } from 'express';
import { ScraperService } from '../services/scraperService';
import { JobOfferModel } from '../models/JobOffer';
import { MatchingService } from '../services/matchingService';
import { SkillModel } from '../models/Skill';

// POST /api/automation/scrape/freelancer (Ahora soporta búsqueda multi-plataforma, filtros de fecha y ordenamiento)
export const scrapeFreelancer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { query, languages, maxBids, currencies, save, startDate, endDate } = req.body;
        const userId = req.userId!;

        // Si no hay query, usar las habilidades del usuario como términos de búsqueda
        let searchQueries: string[] = [];
        if (query && query.trim() !== '') {
            searchQueries = [query];
        } else {
            const userSkills = await SkillModel.findByUser(userId);
            searchQueries = userSkills.length > 0
                ? userSkills.map(s => s.name)
                : ['Web Development']; // Fallback global
        }

        // Expandir queries para incluir términos en español automáticamente
        searchQueries = ScraperService.expandQueries(searchQueries);

        console.log(`🚀 Iniciando scraping multi-plataforma: queries=[${searchQueries.join(', ')}]`);

        const [freelancerJobs, guruJobs, workanaJobs] = await Promise.all([
            ScraperService.scrapeFreelancer(
                searchQueries,
                languages || ['en', 'es'],
                maxBids || 15,
                currencies
            ),
            ScraperService.scrapeGuru(searchQueries, maxBids || 30),
            ScraperService.scrapeWorkana(searchQueries, maxBids || 30)
        ]);

        let rawJobs = [...freelancerJobs, ...guruJobs, ...workanaJobs];

        // Filtrar por rango de fecha si se proporcionan
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            rawJobs = rawJobs.filter(job => {
                if (!job.posted_date) return true; // Si no hay fecha, no descartamos (o podrías elegir descartar)
                const jobDate = new Date(job.posted_date);
                if (start && jobDate < start) return false;
                if (end && jobDate > end) return false;
                return true;
            });
        }

        // Ordenar por fecha de publicación (descendente - más recientes primero)
        rawJobs.sort((a, b) => {
            const dateA = a.posted_date ? a.posted_date.getTime() : 0;
            const dateB = b.posted_date ? b.posted_date.getTime() : 0;
            return dateB - dateA;
        });

        // Calcular matching para cada oferta basado en el usuario actual
        const jobs = await MatchingService.rankJobsForUser(userId, rawJobs as any);

        if (save) {
            console.log(`💾 Guardando ${jobs.length} ofertas en la base de datos...`);
            for (const job of jobs) {
                let platformId = 1; // Freelancer
                if (job.platform === 'Guru') platformId = 5;
                if (job.platform === 'Workana') platformId = 6;

                await JobOfferModel.create({
                    title: job.title,
                    description: job.description || '',
                    url: job.url,
                    budget_min: job.budget_min ?? undefined,
                    budget_max: job.budget_max ?? undefined,
                    currency: job.currency ?? undefined,
                    external_id: job.external_id ?? undefined,
                    required_skills: job.required_skills || [],
                    platform_id: platformId,
                    posted_date: job.posted_date || undefined
                });
            }
        }

        res.json({
            success: true,
            total: jobs.length,
            freelancer: freelancerJobs.length,
            guru: guruJobs.length,
            workana: workanaJobs.length,
            data: jobs,
            message: `Búsqueda completada: ${freelancerJobs.length} en Freelancer, ${guruJobs.length} en Guru, ${workanaJobs.length} en Workana.`
        });
    } catch (error: any) {
        console.error('Error en scrape multi-plataforma controller:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error durante el scraping'
        });
    }
};

// POST /api/automation/scrape/single (Importa una única oferta por URL)
export const scrapeSingleUrl = async (req: Request, res: Response): Promise<void> => {
    try {
        const { url } = req.body;
        const userId = req.userId!;

        if (!url || typeof url !== 'string') {
            res.status(400).json({ success: false, message: 'URL de oferta requerida.' });
            return;
        }

        console.log(`🔎 Importando oferta individual: ${url}`);

        const job = await ScraperService.scrapeAnyUrl(url);

        if (!job) {
            res.status(404).json({
                success: false,
                message: 'No se pudo encontrar o extraer información de la oferta en esa URL. Asegúrate de que sea una URL de Workana, Freelancer o Guru.'
            });
            return;
        }

        // Calcular matching y devolver como lo hace el buscador general
        const rankedJobs = await MatchingService.rankJobsForUser(userId, [job] as any);

        res.json({
            success: true,
            data: rankedJobs[0],
            message: 'Oferta importada y analizada correctamente.'
        });
    } catch (error: any) {
        console.error('Error en scrapeSingleUrl controller:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error durante la importación'
        });
    }
};
