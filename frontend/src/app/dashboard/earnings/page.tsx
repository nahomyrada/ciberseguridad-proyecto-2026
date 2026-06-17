'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import { DollarSign, Loader2, TrendingUp, PlusCircle, X } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface Earning {
    id: number;
    application_id: number;
    amount: number;
    currency: string;
    received_date: string;
    platform_fee: number;
    net_amount: number;
}

interface Summary {
    month: string;
    total_net_earnings: number;
    total_gross_earnings: number;
    total_fees: number;
    projects_completed: number;
}

export default function EarningsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [earnings, setEarnings] = useState<Earning[]>([]);
    const [summary, setSummary] = useState<Summary[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        application_id: '',
        amount: '',
        currency: 'USD',
        received_date: new Date().toISOString().split('T')[0],
        platform_fee: '0',
    });

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const [earningsRes, summaryRes] = await Promise.all([
                    api.get('/api/earnings'),
                    api.get('/api/earnings/summary'),
                ]);
                setEarnings(earningsRes.data.data);
                setSummary(summaryRes.data.data.slice(0, 6).reverse());
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleCreateEarning = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/api/earnings', {
                application_id: parseInt(form.application_id),
                amount: parseFloat(form.amount),
                currency: form.currency,
                received_date: form.received_date,
                platform_fee: parseFloat(form.platform_fee),
            });
            setEarnings((prev) => [data.data, ...prev]);
            setShowForm(false);
            setForm({ application_id: '', amount: '', currency: 'USD', received_date: new Date().toISOString().split('T')[0], platform_fee: '0' });
            console.log(data);
        } catch (err) {
            console.error('Error al crear earning:', err);
        }
    };

    const totalNet = earnings.reduce((s, e) => s + Number(e.net_amount), 0);
    const totalGross = earnings.reduce((s, e) => s + Number(e.amount), 0);
    const totalFees = earnings.reduce((s, e) => s + Number(e.platform_fee), 0);

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
                    <h1 className="page-title">Ganancias</h1>
                    <p className="page-subtitle">Historial y resumen de ingresos</p>
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" />
                    Registrar ganancia
                </button>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Ganancias brutas', value: `$${totalGross.toFixed(2)}`, icon: DollarSign, color: 'text-slate-300' },
                    { label: 'Comisiones plataforma', value: `$${totalFees.toFixed(2)}`, icon: TrendingUp, color: 'text-amber-400' },
                    { label: 'Ganancias netas', value: `$${totalNet.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="card">
                        <div className="flex items-center gap-3 mb-2">
                            <Icon className={`w-5 h-5 ${color}`} />
                            <span className="text-sm text-slate-400">{label}</span>
                        </div>
                        <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Chart */}
            {summary.length > 0 && (
                <div className="card mb-8">
                    <h2 className="text-lg font-semibold text-slate-100 mb-6">Ganancias por mes</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={summary}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                            <XAxis
                                dataKey="month"
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickFormatter={(v) => new Date(v).toLocaleDateString('es', { month: 'short' })}
                            />
                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                                formatter={(v: number) => [`$${v.toFixed(2)}`]}
                            />
                            <Bar dataKey="total_net_earnings" name="Neto" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="total_fees" name="Comisiones" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Table */}
            <div className="card overflow-hidden">
                <h2 className="text-lg font-semibold text-slate-100 mb-4">Registro de ganancias</h2>
                {earnings.length === 0 ? (
                    <div className="text-center py-12">
                        <DollarSign className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No hay ganancias registradas aún</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 text-left">
                                    <th className="pb-3 text-slate-400 font-medium">Fecha</th>
                                    <th className="pb-3 text-slate-400 font-medium">Monto bruto</th>
                                    <th className="pb-3 text-slate-400 font-medium">Comisión</th>
                                    <th className="pb-3 text-slate-400 font-medium">Neto</th>
                                    <th className="pb-3 text-slate-400 font-medium">Moneda</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {earnings.map((e) => (
                                    <tr key={e.id} className="hover:bg-white/2 transition-colors">
                                        <td className="py-3 text-slate-300">
                                            {new Date(e.received_date).toLocaleDateString('es')}
                                        </td>
                                        <td className="py-3 text-slate-300">${Number(e.amount).toFixed(2)}</td>
                                        <td className="py-3 text-amber-400">${Number(e.platform_fee).toFixed(2)}</td>
                                        <td className="py-3 text-emerald-400 font-medium">${Number(e.net_amount).toFixed(2)}</td>
                                        <td className="py-3 text-slate-400">{e.currency}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal para crear ganancia */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="card w-full max-w-md animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-100">Registrar ganancia</h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateEarning} className="space-y-4">
                            <div>
                                <label className="label">Application ID</label>
                                <input type="number" className="input-field" value={form.application_id}
                                    onChange={(e) => setForm({ ...form, application_id: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Monto bruto</label>
                                    <input type="number" step="0.01" className="input-field" value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="label">Comisión plataforma</label>
                                    <input type="number" step="0.01" className="input-field" value={form.platform_fee}
                                        onChange={(e) => setForm({ ...form, platform_fee: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Moneda</label>
                                    <select className="input-field" value={form.currency}
                                        onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                                        <option>USD</option><option>EUR</option><option>GBP</option><option>ARS</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Fecha recibida</label>
                                    <input type="date" className="input-field" value={form.received_date}
                                        onChange={(e) => setForm({ ...form, received_date: e.target.value })} required />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary flex-1">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
