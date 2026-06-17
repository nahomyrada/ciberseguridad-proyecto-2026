'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import {
    CheckCircle,
    XCircle,
    Clock,
    DollarSign,
    MessageSquare,
    MoreVertical,
    Loader2,
    Calendar,
    Briefcase,
    Zap
} from 'lucide-react';
import clsx from 'clsx';

interface Application {
    id: number;
    proposal_id: number;
    job_title: string;
    generated_content: string;
    sent_date: string;
    response_status: string | null;
    response_date: string | null;
    notes: string | null;
}

export default function ApplicationsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<number | null>(null);

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    const fetchApplications = async () => {
        try {
            const { data } = await api.get('/api/applications');
            setApplications(data.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchApplications();
    }, [user]);

    const updateStatus = async (id: number, status: string) => {
        setUpdating(id);
        try {
            await api.patch(`/api/applications/${id}/status`, { response_status: status });
            setApplications(applications.map(a => a.id === id ? { ...a, response_status: status, response_date: new Date().toISOString() } : a));
        } catch (err) {
            alert('Error al actualizar estado');
        } finally {
            setUpdating(null);
        }
    };

    const registerEarning = (appId: number) => {
        // En un futuro abriremos un modal, por ahora redirigimos a la página de ganancias
        // Pasando el application_id por query params o simplemente informando.
        alert('Redirigiendo a registro de ganancias...');
        router.push(`/dashboard/earnings?app_id=${appId}`);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-700">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-100 uppercase tracking-tight">
                    Seguimiento de <span className="text-brand-400">Aplicaciones</span>
                </h1>
                <p className="text-slate-400 mt-1">Monitorea tus procesos activos y registra tus éxitos.</p>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            ) : applications.length === 0 ? (
                <div className="bg-dark-800/30 border border-slate-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-8 h-8 text-slate-600" />
                    </div>
                    <h2 className="text-lg font-medium text-slate-300">No hay procesos activos</h2>
                    <p className="text-slate-500 mt-2">Acepta propuestas en la sección de Propuestas para empezar el seguimiento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {applications.map((app) => (
                        <div key={app.id} className="bg-dark-800/50 border border-slate-800/60 rounded-2xl p-6 flex flex-col h-full hover:border-brand-500/30 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 bg-brand-500/10 rounded-xl">
                                    <Briefcase className="w-5 h-5 text-brand-400" />
                                </div>
                                <div className={clsx(
                                    "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                    !app.response_status && "bg-slate-500/10 text-slate-400 border border-slate-500/20",
                                    app.response_status === 'hired' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                    app.response_status === 'interview' && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                                    app.response_status === 'rejected' && "bg-red-500/10 text-red-400 border border-red-500/20"
                                )}>
                                    {app.response_status || 'Enviada'}
                                </div>
                            </div>

                            <h3 className="text-slate-100 font-bold mb-2 line-clamp-1">{app.job_title}</h3>

                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(app.sent_date).toLocaleDateString()}</span>
                            </div>

                            <div className="bg-dark-900/50 rounded-xl p-3 text-[13px] text-slate-400 leading-relaxed mb-6 flex-1 italic line-clamp-3">
                                "{app.generated_content}"
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        disabled={updating === app.id}
                                        onClick={() => updateStatus(app.id, 'interview')}
                                        className="btn-ghost text-xs py-2 bg-blue-600/5 border border-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white"
                                    >
                                        Entrevista
                                    </button>
                                    <button
                                        disabled={updating === app.id}
                                        onClick={() => updateStatus(app.id, 'rejected')}
                                        className="btn-ghost text-xs py-2 bg-red-600/5 border border-red-600/10 text-red-400 hover:bg-red-600 hover:text-white"
                                    >
                                        Rechazado
                                    </button>
                                </div>

                                <button
                                    onClick={() => updateStatus(app.id, 'hired')}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" /> ¡He sido contratado!
                                </button>

                                {app.response_status === 'hired' && (
                                    <button
                                        onClick={() => registerEarning(app.id)}
                                        className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-black shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <DollarSign className="w-4 h-4" /> Registrar Ganancia
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
