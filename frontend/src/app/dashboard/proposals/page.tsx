'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import {
    FileText,
    Clock,
    Check,
    X,
    Edit2,
    Trash2,
    ExternalLink,
    Loader2,
    CheckCircle,
    Send,
    Bot
} from 'lucide-react';
import clsx from 'clsx';

interface Proposal {
    id: number;
    job_offer_id: number;
    job_title: string;
    job_url: string;
    generated_content: string;
    status: 'pending_review' | 'approved' | 'rejected' | 'sent';
    created_at: string;
}

export default function ProposalsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    const fetchProposals = async () => {
        try {
            const { data } = await api.get('/api/proposals');
            setProposals(data.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchProposals();
    }, [user]);

    const deleteProposal = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar esta propuesta?')) return;
        try {
            await api.delete(`/api/proposals/${id}`);
            setProposals(proposals.filter(p => p.id !== id));
        } catch (err) {
            alert('Error al eliminar');
        }
    };

    const updateStatus = async (id: number, status: Proposal['status']) => {
        try {
            await api.patch(`/api/proposals/${id}/status`, { status });
            setProposals(proposals.map(p => p.id === id ? { ...p, status } : p));
        } catch (err) {
            alert('Error al actualizar estado');
        }
    };

    const handleSaveEdit = async () => {
        if (!editingProposal) return;
        setSaving(true);
        try {
            await api.patch(`/api/proposals/${editingProposal.id}`, {
                generated_content: editingProposal.generated_content
            });
            setProposals(proposals.map(p => p.id === editingProposal.id ? editingProposal : p));
            setEditingProposal(null);
        } catch (err) {
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const convertToApplication = async (proposal: Proposal) => {
        try {
            await api.post('/api/applications', { proposal_id: proposal.id });
            alert('¡Propuesta convertida en Aplicación!');
            router.push('/dashboard/applications');
        } catch (err) {
            alert('Error al crear aplicación');
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 uppercase tracking-tight">
                        Gestión de <span className="text-brand-400">Propuestas</span>
                    </h1>
                    <p className="text-slate-400 mt-1">Revisa, edita y haz seguimiento de tus propuestas enviadas.</p>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            ) : proposals.length === 0 ? (
                <div className="bg-dark-800/30 border border-slate-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-600" />
                    </div>
                    <h2 className="text-lg font-medium text-slate-300">No hay propuestas aún</h2>
                    <p className="text-slate-500 mt-2">Genera propuestas desde la sección de Ofertas usando la IA.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {proposals.map((proposal) => (
                        <div key={proposal.id} className="bg-dark-800/50 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 hover:border-slate-700/80 transition-all group shadow-sm">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-slate-100 font-bold text-lg group-hover:text-brand-400 transition-colors">
                                                    {proposal.job_title}
                                                </h3>
                                                <a href={proposal.job_url} target="_blank" rel="noopener" className="text-slate-500 hover:text-white">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </div>
                                            <span className={clsx(
                                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                proposal.status === 'pending_review' && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                                                proposal.status === 'sent' && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                                proposal.status === 'approved' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                                proposal.status === 'rejected' && "bg-red-500/10 text-red-500 border-red-500/20"
                                            )}>
                                                {proposal.status === 'pending_review' ? 'Pendiente' :
                                                    proposal.status === 'sent' ? 'Enviada' :
                                                        proposal.status === 'approved' ? 'Aceptada' : 'Rechazada'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingProposal(proposal)}
                                                className="p-2 bg-dark-800 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-brand-400/5 transition-all"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteProposal(proposal.id)}
                                                className="p-2 bg-dark-800 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-dark-950/40 rounded-xl p-4 border border-slate-800/50 mb-6">
                                        <p className="text-slate-300 text-sm leading-relaxed line-clamp-4 italic">
                                            "{proposal.generated_content}"
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">Acciones rápidas:</span>
                                            <button
                                                onClick={() => updateStatus(proposal.id, 'sent')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600 text-white transition-all text-xs font-bold"
                                            >
                                                <Send className="w-3 h-3" /> Marcar Enviada
                                            </button>
                                            <button
                                                onClick={() => updateStatus(proposal.id, 'approved')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 text-white transition-all text-xs font-bold"
                                            >
                                                <CheckCircle className="w-3 h-3" /> Marcar Aceptada
                                            </button>
                                        </div>

                                        {proposal.status === 'approved' && (
                                            <button
                                                onClick={() => convertToApplication(proposal)}
                                                className="ml-auto px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-black shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2"
                                            >
                                                <Check className="w-4 h-4" /> Crear Aplicación
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingProposal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
                    <div className="bg-dark-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Edit2 className="w-5 h-5 text-brand-400" />
                                <h3 className="text-lg font-bold text-slate-100">Editar Propuesta</h3>
                            </div>
                            <button onClick={() => setEditingProposal(null)}><X className="w-5 h-5 text-slate-500" /></button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            <textarea
                                className="w-full h-80 bg-dark-800 border border-slate-700 rounded-xl p-4 text-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all resize-none"
                                value={editingProposal.generated_content}
                                onChange={(e) => setEditingProposal({ ...editingProposal, generated_content: e.target.value })}
                            />
                        </div>
                        <div className="p-6 bg-dark-800/30 border-t border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setEditingProposal(null)} className="px-5 py-2 text-slate-400">Cancelar</button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
