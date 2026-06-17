'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import { Globe, PlusCircle, X, Loader2, Link2, Settings, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

interface Platform {
    id: number;
    name: string;
    base_url: string | null;
    has_api: boolean;
    is_active: boolean;
}

export default function PlatformsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        name: '',
        base_url: '',
        has_api: false,
    });

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    useEffect(() => {
        if (!user) return;
        const fetchPlatforms = async () => {
            try {
                const { data } = await api.get('/api/platforms');
                setPlatforms(data.data);
            } catch (error) {
                console.error('Error fetching platforms:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlatforms();
    }, [user]);

    const handleCreatePlatform = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/api/platforms', form);
            setPlatforms((prev) => [...prev, data.data]);
            setShowForm(false);
            setForm({ name: '', base_url: '', has_api: false });
        } catch (err) {
            console.error('Error creating platform:', err);
        }
    };

    const toggleStatus = async (platform: Platform) => {
        try {
            const newStatus = !platform.is_active;
            const { data } = await api.patch(`/api/platforms/${platform.id}`, { is_active: newStatus });
            setPlatforms((prev) =>
                prev.map((p) => (p.id === platform.id ? data.data : p))
            );
        } catch (err) {
            console.error('Error updating platform status:', err);
        }
    };

    if (isLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="page-title text-slate-100">Plataformas</h1>
                    <p className="page-subtitle text-slate-400">Gestiona los sitios de donde el bot busca ofertas</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <PlusCircle className="w-4 h-4" />
                    Nueva plataforma
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {platforms.map((platform) => (
                    <div key={platform.id} className="card-hover flex flex-col justify-between">
                        <div>
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-dark-800 rounded-xl flex items-center justify-center border border-slate-700">
                                    <Globe className="w-6 h-6 text-brand-400" />
                                </div>
                                <div className="flex gap-2">
                                    {platform.has_api && (
                                        <span className="badge-blue">API</span>
                                    )}
                                    <span className={clsx('badge', platform.is_active ? 'badge-green' : 'badge-red')}>
                                        {platform.is_active ? 'Activa' : 'Inactiva'}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-100 mb-2">{platform.name}</h3>

                            {platform.base_url && (
                                <a
                                    href={platform.base_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-400 transition-colors mb-4"
                                >
                                    <Link2 className="w-3.5 h-3.5" />
                                    {new URL(platform.base_url).hostname}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-slate-800/50">
                            <button
                                onClick={() => toggleStatus(platform)}
                                className={clsx(
                                    'flex-1 py-2 text-xs font-medium rounded-lg transition-colors',
                                    platform.is_active
                                        ? 'bg-red-600/10 text-red-400 hover:bg-red-600/20'
                                        : 'bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20'
                                )}
                            >
                                {platform.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                            <button className="p-2 bg-dark-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {platforms.length === 0 && (
                    <div className="col-span-full card text-center py-20">
                        <Globe className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">No hay plataformas configuradas</p>
                    </div>
                )}
            </div>

            {/* Modal Nueva Plataforma */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="card w-full max-w-md animate-slide-up shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-100">Nueva Plataforma</h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePlatform} className="space-y-4">
                            <div>
                                <label className="label">Nombre</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Ej: Upwork, Freelancer.com"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">URL Base</label>
                                <input
                                    type="url"
                                    className="input-field"
                                    placeholder="https://www.ejemplo.com"
                                    value={form.base_url}
                                    onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="has_api"
                                    className="w-4 h-4 rounded border-slate-700 bg-dark-900 text-brand-600 focus:ring-brand-500"
                                    checked={form.has_api}
                                    onChange={(e) => setForm({ ...form, has_api: e.target.checked })}
                                />
                                <label htmlFor="has_api" className="text-sm font-medium text-slate-300 cursor-pointer">
                                    ¿Tiene API oficial?
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    Guardar Plataforma
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
