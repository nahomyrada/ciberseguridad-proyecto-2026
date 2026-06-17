import Link from 'next/link';
import { Bot, Zap, BarChart3, Shield } from 'lucide-react';

const features = [
    {
        icon: Zap,
        title: 'Postulaciones automáticas',
        description: 'El bot detecta y aplica a freelance jobs que coinciden con tu perfil.',
    },
    {
        icon: BarChart3,
        title: 'Dashboard de métricas',
        description: 'Visualiza tus ganancias, propuestas enviadas y tasas de respuesta.',
    },
    {
        icon: Shield,
        title: 'Seguro y privado',
        description: 'Tus credenciales y datos siempre protegidos con JWT y bcrypt.',
    },
];

export default function HomePage() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex flex-col">
            {/* Hero */}
            <section className="flex-1 flex items-center justify-center px-4 py-20 relative overflow-hidden">
                {/* Fondo decorativo */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl" />
                    <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-purple-600/8 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-3xl mx-auto text-center animate-slide-up">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-600/15 border border-brand-600/30 text-brand-400 text-sm font-medium mb-8">
                        <Bot className="w-4 h-4" />
                        Automatización inteligente de freelancing
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-100 mb-6 leading-tight">
                        Automatiza tus{' '}
                        <span className="gradient-text">postulaciones</span>
                        {' '}freelance
                    </h1>

                    <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
                        AutoApply Bot analiza ofertas de trabajo, genera propuestas personalizadas
                        y lleva el seguimiento de tus ganancias. Todo en un solo lugar.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/register" className="btn-primary text-base px-8 py-3 glow">
                            Empezar gratis
                        </Link>
                        <Link href="/login" className="btn-secondary text-base px-8 py-3">
                            Iniciar sesión
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-4 border-t border-slate-800">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl font-bold text-center text-slate-100 mb-12">
                        Todo lo que necesitas para hacer crecer tu freelancing
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {features.map(({ icon: Icon, title, description }) => (
                            <div key={title} className="card-hover group">
                                <div className="w-12 h-12 bg-brand-600/15 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-600/25 transition-colors">
                                    <Icon className="w-6 h-6 text-brand-400" />
                                </div>
                                <h3 className="font-semibold text-slate-100 mb-2">{title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
