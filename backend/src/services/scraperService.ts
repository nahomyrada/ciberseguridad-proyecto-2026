import axios from 'axios';
import * as cheerio from 'cheerio';
import { extraerNumeros } from '../utils/utils';

export interface ScrapedJob {
    external_id: string;
    title: string;
    description: string;
    url: string;
    budget_min: number | null;
    budget_max: number | null;
    currency: string;
    bid_count: number;
    platform: string;
    required_skills: string[];
    posted_date?: Date;
}

export interface FreelancerProject {
    id: number;
    title: string;
    preview_description: string;
    url: string;
    seo_url: string;
    currency: {
        code: string;
        sign: string;
    };
    budget: {
        minimum: number;
        maximum: number;
    };
    bid_stats: {
        bid_count: number;
    };
    time_submitted: number;
    jobs?: { name: string }[];
}

export class ScraperService {
    private static FREELANCER_API_URL = 'https://www.freelancer.com/api/projects/0.1/projects/active/';
    private static GURU_BASE_URL = 'https://www.guru.com';
    private static WORKANA_BASE_URL = 'https://www.workana.com';

    // Mapa de sinónimos para expandir la búsqueda en el filtrado local
    private static SYNONYM_MAP: Record<string, string[]> = {
        'web development': [
            'web', 'website', 'front-end', 'frontend', 'back-end', 'backend',
            'fullstack', 'full-stack', 'site', 'hosting', 'development', 'desarrollo',
            'programación', 'programming', 'software', 'app', 'application', 'coder', 'developer'
        ],
        'software architecture': ['architecture', 'design pattern', 'system design', 'senior developer', 'lead', 'architect', 'principal'],
        'mobile app development': ['mobile', 'app', 'ios', 'android', 'flutter', 'react native', 'hybrid app', 'desarrollo móvil', 'application'],
        'python': ['django', 'flask', 'automation', 'script', 'scraping', 'bot', 'fastapi', 'data science', 'backend'],
        'javascript': ['js', 'node', 'react', 'vue', 'angular', 'typescript', 'ts', 'nextjs', 'express', 'frontend', 'fullstack'],
        'artificial intelligence': ['ai', 'machine learning', 'ml', 'openai', 'chatgpt', 'agent', 'bot', 'gpt', 'llm', 'nlp', 'deep learning'],
    };

    // Términos generales que siempre deberían ser considerados relevantes para cualquier búsqueda de desarrollo
    private static GENERAL_DEV_TERMS = ['software', 'programming', 'programacion', 'desarrollo', 'development', 'developer', 'coder'];

    // Mapeo para traducir términos de búsqueda comunes y encontrar más resultados en español
    private static TRANSLATION_MAP: Record<string, string> = {
        'web development': 'desarrollo web',
        'software architecture': 'arquitectura de software',
        'mobile app development': 'desarrollo de aplicaciones móviles',
        'automation': 'automatización',
        'scraping': 'raspado de datos',
        'data science': 'ciencia de datos',
        'machine learning': 'aprendizaje automático',
        'artificial intelligence': 'inteligencia artificial',
        'translator': 'traductor',
        'copywriter': 'redactor',
        'graphic design': 'diseño gráfico',
        'database': 'base de datos',
        'backend': 'back-end',
        'frontend': 'front-end'
    };

    /**
     * Expande una lista de términos de búsqueda incluyendo sus versiones en español si existen.
     */
    public static expandQueries(queries: string[]): string[] {
        const expanded = new Set<string>(queries.map(q => q.toLowerCase()));
        queries.forEach(q => {
            const lowQ = q.toLowerCase();
            if (this.TRANSLATION_MAP[lowQ]) {
                expanded.add(this.TRANSLATION_MAP[lowQ]);
            }
            // Inversa: si buscó en español, añadir inglés
            for (const [en, es] of Object.entries(this.TRANSLATION_MAP)) {
                if (es === lowQ) expanded.add(en);
            }
        });
        return Array.from(expanded);
    }

    /**
     * Extrae habilidades de un texto basándose en el catálogo de habilidades del sistema.
     */
    private static async extractSkillsLocally(text: string): Promise<string[]> {
        const { SkillModel } = require('../models/Skill');
        const allSkills = await SkillModel.findAll(true);
        const fullText = text.toLowerCase();

        return allSkills
            .filter((s: any) => {
                const name = s.name.toLowerCase();
                const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                return regex.test(fullText);
            })
            .map((s: any) => s.name);
    }

    /**
     * Busca proyectos en Freelancer.com usando su API interna.
     */
    static async scrapeFreelancer(queries: string | string[], languages: string[] = ['en', 'es'], maxBids: number = 15, currencies?: string[]): Promise<ScrapedJob[]> {
        try {
            const queryList = Array.isArray(queries) ? queries : [queries];

            const allResults = await Promise.all(
                queryList.map(async (q) => {
                    const params = new URLSearchParams();
                    params.append('compact', 'true');
                    params.append('limit', '100');
                    params.append('sort_field', 'time_updated');
                    params.append('reverse', 'true');
                    params.append('query', q);
                    params.append('jobs', 'true');
                    languages.forEach(lang => params.append('languages[]', lang));

                    const response = await axios.get(this.FREELANCER_API_URL, { params });
                    return response.data?.result?.projects || [];
                })
            );

            const seenIds = new Set();
            const uniqueProjects: FreelancerProject[] = [];
            allResults.flat().forEach((p: FreelancerProject) => {
                if (!seenIds.has(p.id)) {
                    seenIds.add(p.id);
                    uniqueProjects.push(p);
                }
            });

            const filteredProjects = uniqueProjects.filter(p => {
                const content = `${p.title} ${p.preview_description}`.toLowerCase();
                const isRelevant = queryList.some(q => {
                    const lowQ = q.toLowerCase();
                    if (content.includes(lowQ)) return true;
                    const synonyms = this.SYNONYM_MAP[lowQ] || [];
                    if (synonyms.some(syn => content.includes(syn.toLowerCase()))) return true;
                    return this.GENERAL_DEV_TERMS.some(term => content.includes(term.toLowerCase()));
                });

                if (!isRelevant) return false;

                const bidsValid = p.bid_stats.bid_count < maxBids;
                const currencyArray = Array.isArray(currencies) ? currencies : (currencies ? [currencies] : []);
                const normCurrencies = currencyArray.map(c => String(c).toUpperCase());
                const projectCurrency = (p.currency.code || '').toUpperCase();
                const currencyValid = normCurrencies.length === 0 || normCurrencies.includes(projectCurrency);

                return bidsValid && currencyValid;
            });

            return await Promise.all(filteredProjects.map(async (p) => {
                const detectedSkills = await this.extractSkillsLocally(`${p.title} ${p.preview_description}`);
                const finalSkills = Array.from(new Set([...(p.jobs || []).map(j => j.name), ...detectedSkills]));

                return {
                    external_id: p.id.toString(),
                    title: p.title,
                    description: p.preview_description,
                    url: `https://www.freelancer.com/projects/${p.seo_url}`,
                    budget_min: p.budget.minimum,
                    budget_max: p.budget.maximum,
                    currency: p.currency.code,
                    bid_count: p.bid_stats.bid_count,
                    platform: 'Freelancer',
                    required_skills: finalSkills,
                    posted_date: p.time_submitted ? new Date(p.time_submitted * 1000) : undefined
                };
            }));
        } catch (error: any) {
            console.error('Error en ScraperService (Freelancer):', error.message);
            throw new Error(`Error al scrapear Freelancer: ${error.message}`);
        }
    }

    /**
     * Busca proyectos en Guru.com scrapeando su web.
     */
    static async scrapeGuru(queries: string | string[], maxBids: number = 30): Promise<ScrapedJob[]> {
        try {
            const queryList = Array.isArray(queries) ? queries : [queries];
            const allJobs: ScrapedJob[] = [];

            for (const q of queryList) {
                // Normalizar query para Guru.com: Capitalizar cada palabra y unir con guiones
                const normalizedSkill = q.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join('-');

                // Guru usa un patrón /d/jobs/skill/{Skill}/ para mejores resultados
                const url = `${this.GURU_BASE_URL}/d/jobs/skill/${encodeURIComponent(normalizedSkill)}/`;
                console.log(`🌐 Scrapeando Guru: ${url}`);

                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });

                const $ = cheerio.load(response.data);
                $('.jobRecord').each((_, element) => {
                    const $el = $(element);
                    const titleEl = $el.find('.jobRecord__title a');
                    const title = titleEl.text().trim();
                    const link = this.GURU_BASE_URL + titleEl.attr('href');
                    const description = $el.find('.jobRecord__desc').text().trim();
                    const budgetText = $el.find('.jobRecord__budget').text().trim();
                    const meta = $el.find('.jobRecord__meta').text().replace(/\s+/g, ' ').trim();
                    // Extraer fecha de publicación (Formatos: "Posted on Feb 22, 2026" o "Posted 8 hrs ago")
                    let posted_date = undefined;
                    const dateMatch = meta.match(/on\s+([a-z]{3}\s+\d{1,2},\s+\d{4})/i);
                    const relativeMatch = meta.match(/(\d+)\s+hrs?\s+ago/i);

                    if (dateMatch) {
                        posted_date = new Date(dateMatch[1]);
                    } else if (relativeMatch) {
                        const hours = parseInt(relativeMatch[1]);
                        posted_date = new Date();
                        posted_date.setHours(posted_date.getHours() - hours);
                    }

                    // Extraer bids (Quotes Received)
                    let bidCount = 0;
                    const quotesMatch = meta.match(/(\d+)\s+Quotes/i);
                    if (quotesMatch) {
                        bidCount = parseInt(quotesMatch[1]);
                    }

                    const nums = extraerNumeros(budgetText);
                    let budget_min = nums.length > 0 ? nums[0] : null;
                    let budget_max = nums.length > 1 ? nums[1] : (nums.length === 1 ? nums[0] : null);
                    let currency = 'USD';

                    // Si es Fixed Price pero no hay montos, se queda en null (sin información)
                    if (budgetText.toLowerCase().includes('fixed price') && nums.length === 0) {
                        budget_min = null;
                        budget_max = null;
                    }

                    // ID externo: Guru suele tenerlo al final de la URL /2116396
                    const idMatch = link.match(/\/(\d+)(?:&|$)/);
                    const external_id = idMatch ? idMatch[1] : `guru-${Math.random().toString(36).substr(2, 9)}`;

                    allJobs.push({
                        external_id,
                        title,
                        description,
                        url: link,
                        budget_min,
                        budget_max,
                        currency,
                        bid_count: bidCount,
                        platform: 'Guru',
                        required_skills: [],
                        posted_date
                    });
                });
            }

            // Deduplicar y filtrar relevancia + bids
            const seenIds = new Set();
            const uniqueJobs = allJobs.filter(j => {
                if (seenIds.has(j.external_id)) return false;
                seenIds.add(j.external_id);

                // Nuevo: Filtrar por bids en Guru
                if (j.bid_count >= maxBids) return false;

                const content = `${j.title} ${j.description}`.toLowerCase();
                const isRelevant = queryList.length === 0 || queryList.some(q => {
                    const lowQ = q.toLowerCase();
                    if (content.includes(lowQ)) return true;
                    // Buscar sinónimos para cualquier palabra de la query o la query completa
                    const synonyms = this.SYNONYM_MAP[lowQ] || [];
                    if (synonyms.some(syn => content.includes(syn.toLowerCase()))) return true;
                    return true; // Si llegamos aquí en Guru, es porque el skill ya filtró por URL, así que es relevante
                });

                return isRelevant;
            });

            // Inyectar habilidades detectadas localmente
            return await Promise.all(uniqueJobs.map(async (j) => {
                const detectedSkills = await this.extractSkillsLocally(`${j.title} ${j.description}`);
                return { ...j, required_skills: detectedSkills };
            }));

        } catch (error: any) {
            console.error('Error en ScraperService (Guru):', error.message);
            // Si Guru falla, devolvemos vacío en lugar de romper todo
            return [];
        }
    }

    /**
     * Busca proyectos en Workana.com scrapeando su web y extrayendo el JSON inicial.
     */
    static async scrapeWorkana(queries: string | string[], maxBids: number = 20): Promise<ScrapedJob[]> {
        try {
            const queryList = Array.isArray(queries) ? queries : [queries];
            const allJobs: ScrapedJob[] = [];

            for (const q of queryList) {
                // Buscamos en las primeras 3 páginas de resultados para mayor profundidad
                for (let page = 1; page <= 3; page++) {
                    const url = `${this.WORKANA_BASE_URL}/es/jobs?query=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ''}`;
                    console.log(`🌐 Scrapeando Workana (Pág ${page}): ${url}`);

                    try {
                        const response = await axios.get(url, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                            },
                            timeout: 10000 // Timeout para evitar bloqueos
                        });

                        const $ = cheerio.load(response.data);
                        const resultsRaw = $('search').attr(':results-initials');
                        if (!resultsRaw) {
                            console.log(`⚠️ No se encontró JSON de resultados en pág ${page} de Workana`);
                            break; // Si no hay resultados en esta página, no seguimos paginando para esta query
                        }

                        const data = JSON.parse(resultsRaw);
                        const projects = data.results || [];

                        if (projects.length === 0) break; // Fin de resultados

                        for (const p of projects) {
                            // Extraer ID de la URL o slug
                            const external_id = p.slug || `workana-${Math.random().toString(36).substr(2, 9)}`;

                            // Parsear título del HTML (Workana envía strings con tags <a>)
                            const title = cheerio.load(p.title).root().text().trim();

                            // Parsear presupuesto
                            const { min, max } = this.parseWorkanaBudget(p.budget);

                            // Parsear propuestas (Bids)
                            const bids = extraerNumeros(p.totalBids)[0] || 0;

                            // Filtrar por bids - IMPORTANTE: No descartamos aquí, lo dejamos para el filtro final
                            // o mantenemos el comportamiento pero con el límite del usuario.
                            if (bids >= maxBids) continue;

                            // Parsear fecha (Publicado: Ayer, Hace 6 horas, etc.)
                            const posted_date = this.parseWorkanaDate(p.publishedDate);

                            allJobs.push({
                                external_id,
                                title,
                                description: p.description.replace(/<[^>]*>?/gm, '').trim(),
                                url: `${this.WORKANA_BASE_URL}/job/${p.slug}`,
                                budget_min: min,
                                budget_max: max,
                                currency: 'USD',
                                bid_count: bids,
                                platform: 'Workana',
                                required_skills: (p.skills || []).map((s: any) => s.anchorText),
                                posted_date
                            });
                        }
                    } catch (err: any) {
                        console.error(`❌ Error en pág ${page} de Workana:`, err.message);
                        break; // Error en esta página, saltamos a la siguiente query
                    }
                }
            }

            // Deduplicar por external_id
            const seenIds = new Set();
            return allJobs.filter(j => {
                if (seenIds.has(j.external_id)) return false;
                seenIds.add(j.external_id);
                return true;
            });

        } catch (error: any) {
            console.error('Error en ScraperService (Workana):', error.message);
            return [];
        }
    }

    /**
     * Helper para parsear fechas de Workana (español).
     */
    private static parseWorkanaDate(dateStr: string): Date | undefined {
        if (!dateStr) return undefined;
        const lowDate = dateStr.toLowerCase();
        const now = new Date();

        if (lowDate.includes('ayer')) {
            now.setDate(now.getDate() - 1);
            return now;
        }

        const hourMatch = lowDate.match(/hace (\d+) hora/);
        if (hourMatch) {
            now.setHours(now.getHours() - parseInt(hourMatch[1]));
            return now;
        }

        const dayMatch = lowDate.match(/hace (\d+) día/);
        if (dayMatch) {
            now.setDate(now.getDate() - parseInt(dayMatch[1]));
            return now;
        }

        const minuteMatch = lowDate.match(/hace (\d+) minuto/);
        if (minuteMatch) {
            now.setMinutes(now.getMinutes() - parseInt(minuteMatch[1]));
            return now;
        }

        return undefined;
    }

    /**
     * Helper para extraer montos del presupuesto de Workana.
     */
    private static parseWorkanaBudget(budgetStr: string): { min: number | null, max: number | null } {
        if (!budgetStr) return { min: null, max: null };
        const nums = extraerNumeros(budgetStr);
        if (nums.length >= 2) return { min: nums[0], max: nums[1] };
        if (nums.length === 1) {
            if (budgetStr.toLowerCase().includes('menos de')) return { min: null, max: nums[0] };
            if (budgetStr.toLowerCase().includes('más de')) return { min: nums[0], max: null };
            return { min: nums[0], max: nums[0] };
        }
        return { min: null, max: null };
    }

    /**
     * Scrapea una oferta específica de Workana a partir de su URL.
     * Utiliza el motor de búsqueda para encontrar la oferta exacta por su slug.
     */
    static async scrapeWorkanaSingle(url: string): Promise<ScrapedJob | null> {
        try {
            const slugMatch = url.match(/\/job\/([^/?#]+)/);
            if (!slugMatch) return null;
            const slug = slugMatch[1];

            // Usamos el buscador pero con el slug exacto
            const jobs = await this.scrapeWorkana([slug], 100);
            return jobs.find(j => j.external_id === slug) || jobs[0] || null;
        } catch (error) {
            console.error('Error scrapeando Workana single:', error);
            return null;
        }
    }

    /**
     * Scrapea una oferta específica de Freelancer a partir de su URL.
     */
    static async scrapeFreelancerSingle(url: string): Promise<ScrapedJob | null> {
        try {
            // Extraer el slug o ID de la URL
            const slugMatch = url.match(/\/projects\/([^/?#]+)/);
            if (!slugMatch) return null;
            const slug = slugMatch[1];

            // Freelancer permite buscar por query exacta (slug)
            const jobs = await this.scrapeFreelancer(slug, ['en', 'es'], 100);
            return jobs.find(j => j.url.includes(slug)) || jobs[0] || null;
        } catch (error) {
            console.error('Error scrapeando Freelancer single:', error);
            return null;
        }
    }

    /**
     * Scrapea una oferta específica de Guru a partir de su URL.
     */
    static async scrapeGuruSingle(url: string): Promise<ScrapedJob | null> {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);

            const title = $('h1').text().trim() || $('.jobRecord__title').text().trim();
            const description = $('.job-description').text().trim() || $('.jobRecord__desc').text().trim() || $('#jobDescription').text().trim();

            const idMatch = url.match(/\/(\d+)(?:&|$|\/)/);
            const external_id = idMatch ? idMatch[1] : `guru-${Math.random().toString(36).substr(2, 9)}`;

            if (!title) return null;

            return {
                external_id,
                title,
                description: description || 'No se pudo extraer la descripción completa.',
                url,
                budget_min: null,
                budget_max: null,
                currency: 'USD',
                bid_count: 0,
                platform: 'Guru',
                required_skills: [],
                posted_date: new Date()
            };
        } catch (error) {
            console.error('Error scrapeando Guru single:', error);
            return null;
        }
    }

    /**
     * Método genérico para importar cualquier URL.
     */
    static async scrapeAnyUrl(url: string): Promise<ScrapedJob | null> {
        if (url.includes('workana.com')) return this.scrapeWorkanaSingle(url);
        if (url.includes('freelancer.com') || url.includes('freelancer.es')) return this.scrapeFreelancerSingle(url);
        if (url.includes('guru.com')) return this.scrapeGuruSingle(url);
        return null;
    }
}
