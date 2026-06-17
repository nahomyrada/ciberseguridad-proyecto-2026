'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
    LayoutDashboard,
    Briefcase,
    FileText,
    DollarSign,
    Globe,
    Zap,
    LogOut,
    Bot,
    Menu,
    X,
    CheckCircle,
} from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/jobs', label: 'Ofertas', icon: Briefcase },
    { href: '/dashboard/proposals', label: 'Propuestas', icon: FileText },
    { href: '/dashboard/applications', label: 'Aplicaciones', icon: CheckCircle },
    { href: '/dashboard/earnings', label: 'Ganancias', icon: DollarSign },
    { href: '/dashboard/platforms', label: 'Plataformas', icon: Globe },
    { href: '/dashboard/skills', label: 'Habilidades', icon: Zap },
];

export default function Header() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-dark-900/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-blue-400 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-slate-100">
                            Auto<span className="text-brand-400">Apply</span>
                        </span>
                    </Link>

                    {/* Nav desktop */}
                    {user && (
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className={clsx(
                                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                                        pathname === href
                                            ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    )}

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        {user ? (
                            <>
                                <div className="hidden md:flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                        {user.username[0].toUpperCase()}
                                    </div>
                                    <span className="text-sm text-slate-300 font-medium">{user.username}</span>
                                </div>
                                <button
                                    onClick={logout}
                                    className="btn-ghost flex items-center gap-2 text-sm text-slate-400 hover:text-red-400"
                                    title="Cerrar sesión"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden md:inline">Salir</span>
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link href="/login" className="btn-ghost text-sm">
                                    Iniciar sesión
                                </Link>
                                <Link href="/register" className="btn-primary text-sm">
                                    Registrarse
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu toggle */}
                        {user && (
                            <button
                                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                                onClick={() => setMobileOpen(!mobileOpen)}
                            >
                                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {user && mobileOpen && (
                <div className="md:hidden border-t border-slate-800 bg-dark-900 px-4 py-3 space-y-1 animate-fade-in">
                    {navItems.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setMobileOpen(false)}
                            className={clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                                pathname === href
                                    ? 'bg-brand-600/20 text-brand-400'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </Link>
                    ))}
                </div>
            )}
        </header>
    );
}
