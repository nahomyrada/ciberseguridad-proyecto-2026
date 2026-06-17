'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import { Briefcase, ExternalLink, Check, X, Clock, Loader2, Search, Bot, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface JobOffer {
    id?: number;
    external_id?: string | null;
    title: string;
    description: string | null;
    url: string;
    required_skills: string[];
    budget_min: number | null;
    budget_max: number | null;
    currency: string;
    client_rating: number | null;
    client_country: string | null;
    bid_count?: number;
    is_relevant: boolean | null;
    discovered_at: string;
    platform?: string;
    match?: {
        score: number;
        matchedSkills: string[];
        missingSkills: string[];
    };
}

export default function JobsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [jobs, setJobs] = useState<JobOffer[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState<string | number | null>(null);
    const [activeProposal, setActiveProposal] = useState<{ job_id: number, content: string } | null>(null);
    const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);
    const [saving, setSaving] = useState(false);

    // Filtros de búsqueda (Scraper)
    const [searchQuery, setSearchQuery] = useState('Web Development');
    const [maxBids, setMaxBids] = useState(30);
    const [currencies, setCurrencies] = useState<string[]>(['USD', 'EUR']);
    const [mySkills, setMySkills] = useState<{ id: number, name: string }[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
        if (user) {
            // Cargar mis habilidades para usarlas como filtros
            api.get('/api/skills/me').then(res => setMySkills(res.data.data)).catch(console.error);
        }
    }, [user, isLoading, router]);

    const fetchScraperJobs = async () => {
        if (!user) return;
        setLoading(true);

        // Combinar búsqueda manual con habilidades seleccionadas
        const queries = [];
        if (searchQuery.trim()) queries.push(searchQuery.trim());
        queries.push(...selectedSkills);

        if (queries.length === 0) queries.push('Web Development'); // Fallback

        try {
            const { data } = await api.post('/api/automation/scrape/freelancer', {
                query: searchQuery.trim(), // El backend ahora maneja las habilidades si esto es vacío
                selectedSkills, // Pasamos opcionalmente para mayor control si fuera necesario
                maxBids: maxBids,
                currencies: currencies,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                save: false
            });
            setJobs(data.data);
        } catch (err) {
            console.error('Error fetching scraper jobs:', err);
            alert("Error al conectar con el scraper. Verifica tu conexión.");
        } finally {
            setLoading(false);
        }
    };

    // Cargar por primera vez con los filtros por defecto
    useEffect(() => {
        if (user) fetchScraperJobs();
    }, [user]);

    const generateAIProposal = async (job: JobOffer) => {
        const jobIdKey = job.id || job.external_id || 'new';
        setGenerating(jobIdKey);
        try {
            // Enviamos jobData para que el backend lo guarde si no existe
            const { data } = await api.post('/api/proposals/generate', {
                job_offer_id: job.id,
                jobData: job.id ? undefined : job
            });

            // Importante: El backend devuelve 'job_id' (el ID real de la DB local)
            setActiveProposal({ job_id: data.data.job_id, content: data.data.content });
        } catch (err) {
            console.error('Error generating AI proposal:', err);
            alert("Error al generar la propuesta. Revisa que la API Key de Gemini esté configurada.");
        } finally {
            setGenerating(null);
        }
    };

    const saveProposal = async () => {
        if (!activeProposal) return;
        setSaving(true);
        try {
            await api.post('/api/proposals', {
                job_offer_id: activeProposal.job_id,
                content: activeProposal.content,
                status: 'pending_review'
            });
            alert("¡Propuesta guardada correctamente!");
            setActiveProposal(null);
            router.push('/dashboard/proposals');
        } catch (err: any) {
            console.error('Error saving proposal:', err);
            const msg = err.response?.data?.message || "Error al guardar la propuesta.";
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="page-title">Buscador Multi-Plataforma</h1>
                    <p className="page-subtitle">Explora proyectos en tiempo real desde Freelancer, Guru y Workana</p>
                </div>
                <button
                    onClick={fetchScraperJobs}
                    disabled={loading}
                    className="btn-primary flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Refrescar Búsqueda
                </button>
            </div>

            {/* Search Controls Panel */}
            <div className="card mb-8 p-6 bg-dark-800/50 border-slate-700/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Palabras Clave</label>
                        <input
                            type="text"
                            className="input-field"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Ej: React Developer, Traductor..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Bids Máximos (Competencia)</label>
                        <input
                            type="number"
                            className="input-field"
                            value={maxBids}
                            onChange={(e) => setMaxBids(parseInt(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Monedas (Ej: USD, EUR)</label>
                        <input
                            type="text"
                            className="input-field"
                            value={currencies.join(', ')}
                            onChange={(e) => setCurrencies(e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(s => s))}
                            placeholder="USD, EUR, CAD"
                        />
                    </div>
                    {/* New Date Range Filters */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Desde (Fecha)</label>
                        <input
                            type="date"
                            className="input-field"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Hasta (Fecha)</label>
                        <input
                            type="date"
                            className="input-field"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-3 pt-6 border-t border-slate-700/30">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Importación Directa (Workana, Freelancer, Guru)</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                className="input-field flex-1"
                                placeholder="Pega aquí la URL de la oferta (Workana, Freelancer o Guru)"
                                id="directUrlImport"
                            />
                            <button
                                onClick={async () => {
                                    const input = document.getElementById('directUrlImport') as HTMLInputElement;
                                    const url = input.value;
                                    if (!url) return;
                                    setLoading(true);
                                    try {
                                        const { data } = await api.post('/api/automation/scrape/single', { url });
                                        if (data.success) {
                                            setJobs(prev => [data.data, ...prev]);
                                            setSelectedJob(data.data);
                                            input.value = '';
                                        }
                                    } catch (err: any) {
                                        alert(err.response?.data?.message || "Error al importar la oferta.");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                                className="btn-primary shrink-0 px-6 py-2 flex items-center gap-2 justify-center"
                            >
                                <ExternalLink className="w-4 h-4" /> Importar
                            </button>
                        </div>
                    </div>
                    <div className="md:col-span-3 pt-4 border-t border-slate-700/30">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Filtrar por mis habilidades</label>
                        <div className="flex flex-wrap gap-2">
                            {mySkills.length > 0 ? (
                                mySkills.map(skill => (
                                    <button
                                        key={skill.id}
                                        onClick={() => {
                                            setSelectedSkills(prev =>
                                                prev.includes(skill.name)
                                                    ? prev.filter(s => s !== skill.name)
                                                    : [...prev, skill.name]
                                            );
                                        }}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                                            selectedSkills.includes(skill.name)
                                                ? "bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-600/20"
                                                : "bg-dark-900 border-slate-700 text-slate-400 hover:text-slate-200"
                                        )}
                                    >
                                        {skill.name}
                                    </button>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 italic">Configura tus habilidades en el perfil para usarlas aquí.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Jobs list */}
            {jobs.length === 0 ? (
                <div className="card text-center py-16">
                    {loading ? (
                        <Loader2 className="w-12 h-12 text-brand-400 mx-auto mb-4 animate-spin" />
                    ) : (
                        <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    )}
                    <p className="text-slate-400">
                        {loading ? 'Buscando proyectos en Freelancer...' : 'No se encontraron ofertas. Intenta con otros filtros o pulsa Refrescar.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {jobs.map((job) => {
                        const jobIdKey = job.id || job.external_id || Math.random();
                        const isGenerating = generating === (job.id || job.external_id || 'new');

                        return (
                            <div
                                key={jobIdKey}
                                className="card-hover flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer"
                                onClick={() => setSelectedJob(job)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2 mb-2">
                                        <h3 className="text-slate-100 font-medium text-sm leading-tight truncate">
                                            {job.title}
                                        </h3>
                                        <div className="flex gap-2 shrink-0">
                                            {job.id ? (
                                                <span className="badge-green text-[10px]">Guardada</span>
                                            ) : (
                                                <span className="badge-blue text-[10px]">Nueva</span>
                                            )}
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                                                job.platform === 'Guru' ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                                                    job.platform === 'Workana' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                                        "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                                            )}>
                                                {job.platform || 'Freelancer'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {job.required_skills?.slice(0, 4).map((s) => (
                                            <span key={s} className="badge-blue text-xs">{s}</span>
                                        ))}
                                    </div>
                                    <div className="flex gap-4 text-xs text-slate-500">
                                        {job.match && (
                                            <div className="flex items-center gap-1.5">
                                                <div className="relative w-8 h-8 flex items-center justify-center">
                                                    <svg className="w-full h-full -rotate-90 transform">
                                                        <circle
                                                            cx="16" cy="16" r="14"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="3"
                                                            className="text-slate-800"
                                                        />
                                                        <circle
                                                            cx="16" cy="16" r="14"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="3"
                                                            strokeDasharray={88}
                                                            strokeDashoffset={88 - (88 * (job.match.score || 0)) / 100}
                                                            strokeLinecap="round"
                                                            className={clsx(
                                                                job.match.score >= 70 ? "text-emerald-500" :
                                                                    job.match.score >= 40 ? "text-amber-500" : "text-rose-500"
                                                            )}
                                                        />
                                                    </svg>
                                                    <span className="absolute text-[9px] font-black text-white">
                                                        {job.match.score}%
                                                    </span>
                                                </div>
                                                <span className="font-bold text-slate-400">Match</span>
                                            </div>
                                        )}
                                        {(job.budget_min || job.budget_max) ? (
                                            <span>
                                                💰 {job.currency || 'USD'} {job.budget_min}
                                                {job.budget_max && job.budget_max !== job.budget_min ? ` - ${job.budget_max}` : ''}
                                            </span>
                                        ) : (
                                            <span>💰 Presupuesto flexible</span>
                                        )}
                                        {job.client_country && <span>🌍 {job.client_country}</span>}
                                        <span>👥 {job.bid_count ?? 0} bids</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <a
                                        href={job.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg bg-dark-800 text-slate-400 hover:text-white transition-colors"
                                        title="Ver oferta original"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>

                                    <button
                                        onClick={() => generateAIProposal(job)}
                                        disabled={generating !== null}
                                        className="btn-primary-sm flex items-center gap-2"
                                        title="Generar propuesta e importar"
                                    >
                                        {isGenerating ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-4 h-4" />
                                        )}
                                        {job.id ? 'Propuesta' : 'Aplicar'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Job Details Modal */}
            {selectedJob && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-950/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-dark-900 border border-slate-700 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-800 flex justify-between items-start bg-gradient-to-r from-dark-800/50 to-transparent">
                            <div className="flex-1">
                                <h2 className="text-2xl font-black text-slate-100 leading-tight mb-2 tracking-tight">
                                    {selectedJob.title}
                                </h2>
                                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-400">
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 rounded-full border border-slate-700">
                                        🌍 {selectedJob.client_country || 'Ubicación no disponible'}
                                    </span>
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 rounded-full border border-slate-700">
                                        ⭐ {selectedJob.client_rating || 'N/A'} rating
                                    </span>
                                    {selectedJob.match && (
                                        <span className={clsx(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-black",
                                            selectedJob.match.score >= 70 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                selectedJob.match.score >= 40 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                    "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                        )}>
                                            🎯 {selectedJob.match.score}% Match
                                        </span>
                                    )}
                                    {selectedJob.platform && (
                                        <span className={clsx(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-black",
                                            selectedJob.platform === 'Guru' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                selectedJob.platform === 'Workana' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                    "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                        )}>
                                            🏢 {selectedJob.platform}
                                        </span>
                                    )}
                                    {(selectedJob.budget_min || selectedJob.budget_max) ? (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full">
                                            💰 {selectedJob.currency || 'USD'} {selectedJob.budget_min}
                                            {selectedJob.budget_max && selectedJob.budget_max !== selectedJob.budget_min ? ` - ${selectedJob.budget_max}` : ''}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full">
                                            💰 Presupuesto no especificado
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-all ml-4"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                            {/* Description */}
                            <section>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Descripción del proyecto</h3>
                                <div className="bg-dark-950/50 rounded-2xl p-6 border border-slate-800/50">
                                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                        {selectedJob.description || 'Sin descripción disponible.'}
                                    </p>
                                </div>
                            </section>

                            {/* Skills Section */}
                            <section>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Matched Skills */}
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-4 flex items-center gap-2">
                                            <Check className="w-3 h-3" /> Tus habilidades
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {(selectedJob.required_skills || []).filter(s => selectedJob.match?.matchedSkills.includes(s)).length > 0 ? (
                                                (selectedJob.required_skills || []).filter(s => selectedJob.match?.matchedSkills.includes(s)).map(skill => (
                                                    <span key={skill} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold">
                                                        {skill}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-600 italic">No hay coincidencias directas.</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Missing Skills */}
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                            <Sparkles className="w-3 h-3" /> Por aprender
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {(selectedJob.required_skills || []).filter(s => !selectedJob.match?.matchedSkills.includes(s)).length > 0 ? (
                                                (selectedJob.required_skills || []).filter(s => !selectedJob.match?.matchedSkills.includes(s)).map(skill => (
                                                    <span key={skill} className="px-3 py-1.5 bg-dark-800 text-slate-400 border border-slate-700 rounded-xl text-xs font-bold">
                                                        {skill}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-600 italic">¡Tienes todas las habilidades!</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 bg-dark-800/50 border-t border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <a
                                href={selectedJob.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" /> Ver publicación original
                            </a>

                            <div className="flex gap-4 w-full sm:w-auto">
                                <button
                                    onClick={() => setSelectedJob(null)}
                                    className="flex-1 sm:flex-none px-8 py-3 rounded-2xl text-sm font-bold text-slate-400 hover:bg-white/5 transition-all"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={() => {
                                        const job = selectedJob;
                                        setSelectedJob(null);
                                        generateAIProposal(job);
                                    }}
                                    className="flex-1 sm:flex-none px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-black shadow-xl shadow-brand-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" /> {selectedJob.id ? 'Generar Propuesta' : 'Aplicar a Oferta'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Proposal Modal */}
            {activeProposal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-dark-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-500/10 rounded-lg">
                                    <Bot className="w-5 h-5 text-brand-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-100 uppercase tracking-tight">Propuesta Generada</h2>
                                    <p className="text-xs text-slate-500">Revisa y ajusta el contenido generado por Gemini</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveProposal(null)}
                                className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <textarea
                                className="w-full h-80 bg-dark-800/50 border border-slate-700 rounded-xl p-4 text-slate-200 text-sm leading-relaxed focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
                                value={activeProposal.content}
                                onChange={(e) => setActiveProposal({ ...activeProposal, content: e.target.value })}
                            />
                        </div>

                        <div className="p-6 bg-dark-800/30 border-t border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => setActiveProposal(null)}
                                className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveProposal}
                                disabled={saving}
                                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-600/20 transition-all flex items-center gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                Guardar Propuesta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
