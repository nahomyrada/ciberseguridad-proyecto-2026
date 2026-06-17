import { Bot, Github } from 'lucide-react';

export default function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="border-t border-slate-800 bg-dark-900 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Bot className="w-4 h-4 text-brand-400" />
                        <span className="text-sm font-medium">AutoApply Bot</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-500">v1.0.0</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>© {year} AutoApply Bot. Todos los derechos reservados.</span>
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-slate-300 transition-colors"
                        >
                            <Github className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
