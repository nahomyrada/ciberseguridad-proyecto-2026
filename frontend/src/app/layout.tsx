'use client';

import '@/styles/globals.css';
import { AuthContext, useAuthState } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const auth = useAuthState();

    return (
        <html lang="es">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="AutoApply Bot - Automatiza tus postulaciones freelance con IA" />
                <title>AutoApply Bot</title>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className="min-h-screen flex flex-col bg-dark-950 text-slate-100 antialiased">
                <AuthContext.Provider value={auth}>
                    <Header />
                    <main className="flex-1 animate-fade-in">
                        {children}
                    </main>
                    <Footer />
                </AuthContext.Provider>
            </body>
        </html>
    );
}
