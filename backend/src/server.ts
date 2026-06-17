import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import pool from './config/database';
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import proposalRoutes from './routes/proposals';
import earningRoutes from './routes/earnings';
import platformRoutes from './routes/platforms';
import skillRoutes from './routes/skills';
import applicationRoutes from './routes/applications';
import automationRoutes from './routes/automation';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rutas ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/earnings', earningRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/automation', automationRoutes);

// ─── 404 y Error Handler ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
const startServer = async () => {
    try {
        // Verificar conexión a BD antes de iniciar
        const client = await pool.connect();
        console.log('✅ Conectado a PostgreSQL');
        client.release();

        app.listen(PORT, () => {
            console.log(`\n🚀 AutoApply Backend corriendo en http://localhost:${PORT}`);
            console.log(`📡 Health check: http://localhost:${PORT}/health`);
            console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}\n`);
        });
    } catch (error) {
        console.error('❌ Error al conectar con PostgreSQL:', error);
        process.exit(1);
    }
};

startServer();

export default app;
