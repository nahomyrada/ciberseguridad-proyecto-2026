'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Bot, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

const passwordRequirements = [
    { label: 'Al menos 8 caracteres', test: (v: string) => v.length >= 8 },
    { label: 'Una letra mayúscula', test: (v: string) => /[A-Z]/.test(v) },
    { label: 'Un número', test: (v: string) => /\d/.test(v) },
];

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();

    const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (form.password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setIsLoading(true);
        try {
            await register(form.username, form.email, form.password);
            router.push('/dashboard');
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Error al registrarse';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md animate-slide-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-500 to-purple-500 rounded-2xl shadow-xl shadow-brand-500/25 mb-4">
                        <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-100">Crea tu cuenta</h1>
                    <p className="text-slate-400 text-sm mt-1">Empieza a automatizar tus postulaciones</p>
                </div>

                <div className="card glow">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="username" className="label">Username</label>
                            <input
                                id="username"
                                type="text"
                                placeholder="john_doe"
                                className="input-field"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                required
                                minLength={3}
                                maxLength={50}
                            />
                        </div>

                        <div>
                            <label htmlFor="reg-email" className="label">Email</label>
                            <input
                                id="reg-email"
                                type="email"
                                placeholder="tu@email.com"
                                className="input-field"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="reg-password" className="label">Contraseña</label>
                            <div className="relative">
                                <input
                                    id="reg-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="input-field pr-12"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Requisitos de contraseña */}
                            {form.password && (
                                <div className="mt-2 space-y-1">
                                    {passwordRequirements.map(({ label, test }) => (
                                        <div key={label} className="flex items-center gap-2 text-xs">
                                            <CheckCircle
                                                className={`w-3.5 h-3.5 transition-colors ${test(form.password) ? 'text-emerald-400' : 'text-slate-600'
                                                    }`}
                                            />
                                            <span className={test(form.password) ? 'text-slate-300' : 'text-slate-500'}>
                                                {label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirm-password" className="label">Confirmar contraseña</label>
                            <input
                                id="confirm-password"
                                type="password"
                                placeholder="••••••••"
                                className="input-field"
                                value={form.confirmPassword}
                                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                required
                            />
                            {form.confirmPassword && form.password !== form.confirmPassword && (
                                <p className="form-error">Las contraseñas no coinciden</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creando cuenta...
                                </>
                            ) : (
                                'Crear cuenta'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-400 text-sm">
                            ¿Ya tienes cuenta?{' '}
                            <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                                Inicia sesión
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
