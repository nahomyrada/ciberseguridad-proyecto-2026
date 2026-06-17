'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import {
    Briefcase,
    FileText,
    DollarSign,
    TrendingUp,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface Stats {
    totalJobs: number;
    pendingJobs: number;
    totalProposals: number;
    sentProposals: number;
    totalEarnings: number;
    monthlySummary: { month: string; total_net_earnings: number }[];
}

const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color: 'blue' | 'green' | 'yellow' | 'purple';
}) => {
    const colors = {
        blue: 'bg-brand-600/15 text-brand-400 border-brand-600/20',
        green: 'bg-emerald-600/15 text-emerald-400 border-emerald-600/20',
        yellow: 'bg-amber-600/15 text-amber-400 border-amber-600/20',
        purple: 'bg-purple-600/15 text-purple-400 border-purple-600/20',
    };

    return (
        <div className="card">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <div className="text-3xl font-bold text-slate-100 mb-1">{value}</div>
            <div className="text-sm font-medium text-slate-300">{title}</div>
            {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
    );
};

export default function DashboardPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (!user) return;

        const fetchStats = async () => {
            try {
                const [jobsRes, proposalsRes, earningsRes, summaryRes] = await Promise.allSettled([
                    api.get('/api/jobs?limit=1000'),
                    api.get('/api/proposals'),
                    api.get('/api/earnings'),
                    api.get('/api/earnings/summary'),
                ]);

                const jobs = jobsRes.status === 'fulfilled' ? jobsRes.value.data.data : [];
                const proposals = proposalsRes.status === 'fulfilled' ? proposalsRes.value.data.data : [];
                const earnings = earningsRes.status === 'fulfilled' ? earningsRes.value.data.data : [];
                const summary = summaryRes.status === 'fulfilled' ? summaryRes.value.data.data : [];

                setStats({
                    totalJobs: jobs.length,
                    pendingJobs: jobs.filter((j: { is_relevant: boolean | null }) => j.is_relevant === null).length,
                    totalProposals: proposals.length,
                    sentProposals: proposals.filter((p: { status: string }) => p.status === 'sent').length,
                    totalEarnings: earnings.reduce((sum: number, e: { net_amount: number }) => sum + Number(e.net_amount), 0),
                    monthlySummary: summary.slice(0, 6).reverse(),
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    if (isLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="mb-8">
                <h1 className="page-title">
                    Hola, <span className="gradient-text">{user?.username}</span> 👋
                </h1>
                <p className="page-subtitle">Aquí tienes un resumen de tu actividad en AutoApply Bot</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Ofertas detectadas"
                    value={stats?.totalJobs ?? 0}
                    subtitle={`${stats?.pendingJobs ?? 0} pendientes de revisar`}
                    icon={Briefcase}
                    color="blue"
                />
                <StatCard
                    title="Propuestas"
                    value={stats?.totalProposals ?? 0}
                    subtitle={`${stats?.sentProposals ?? 0} enviadas`}
                    icon={FileText}
                    color="yellow"
                />
                <StatCard
                    title="Ganancias netas"
                    value={`$${(stats?.totalEarnings ?? 0).toFixed(2)}`}
                    subtitle="Total histórico"
                    icon={DollarSign}
                    color="green"
                />
                <StatCard
                    title="Tasa de conversión"
                    value={
                        stats && stats.totalProposals > 0
                            ? `${((stats.sentProposals / stats.totalProposals) * 100).toFixed(0)}%`
                            : '—'
                    }
                    subtitle="Propuestas / enviadas"
                    icon={TrendingUp}
                    color="purple"
                />
            </div>

            {/* Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card lg:col-span-2">
                    <h2 className="text-lg font-semibold text-slate-100 mb-6">Ganancias mensuales</h2>
                    {stats?.monthlySummary && stats.monthlySummary.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={stats.monthlySummary}>
                                <defs>
                                    <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(v) => new Date(v).toLocaleDateString('es', { month: 'short' })}
                                />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                                    formatter={(v: number) => [`$${v.toFixed(2)}`, 'Ganancias netas']}
                                    labelFormatter={(l) => new Date(l).toLocaleDateString('es', { month: 'long', year: 'numeric' })}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total_net_earnings"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#earningsGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
                            No hay datos de ganancias aún. ¡Registra tu primera ganancia!
                        </div>
                    )}
                </div>

                {/* Quick actions */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-slate-100 mb-4">Acciones rápidas</h2>
                    <div className="space-y-3">
                        {[
                            { icon: Clock, label: 'Revisar ofertas pendientes', href: '/dashboard/jobs?filter=pending', color: 'text-amber-400' },
                            { icon: CheckCircle, label: 'Ver propuestas aprobadas', href: '/dashboard/proposals?status=approved', color: 'text-emerald-400' },
                            { icon: XCircle, label: 'Rechazadas', href: '/dashboard/proposals?status=rejected', color: 'text-red-400' },
                            { icon: DollarSign, label: 'Registrar ganancia', href: '/dashboard/earnings', color: 'text-brand-400' },
                        ].map(({ icon: Icon, label, href, color }) => (
                            <a
                                key={href}
                                href={href}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                            >
                                <Icon className={`w-4 h-4 ${color}`} />
                                <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">{label}</span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
