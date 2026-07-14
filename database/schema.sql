-- ============================================================
-- AutoApply Bot - Schema completo de base de datos
-- Ejecutar en psql: psql -U postgres -d autoapply_db -f schema.sql
-- ============================================================

-- Crear la base de datos (ejecutar como superusuario si no existe)
-- CREATE DATABASE autoapply_db;

-- ─── Tablas principales ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- [BLUE] Fix Information Leak (CWE-200): almacena solo el HASH del token de
-- reset, nunca el token en claro. El token real solo se "envía por email"
-- (se registra en el log del servidor para esta demo académica).
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS user_skills (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
    proficiency INTEGER CHECK (proficiency BETWEEN 1 AND 10),
    PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS platforms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    base_url VARCHAR(255),
    has_api BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS job_offers (
    id SERIAL PRIMARY KEY,
    platform_id INTEGER REFERENCES platforms(id),
    external_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    required_skills TEXT[],
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    currency VARCHAR(3),
    client_rating DECIMAL(2,1),
    client_country VARCHAR(100),
    posted_date TIMESTAMP,
    deadline_date TIMESTAMP,
    url VARCHAR(500) UNIQUE NOT NULL,
    raw_data JSONB,
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_relevant BOOLEAN DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS proposals (
    id SERIAL PRIMARY KEY,
    -- [BLUE] Fix IDOR (A01:2025 / CWE-639): vincula cada propuesta a su propietario.
    -- Habilita la validación de propiedad (Tenant Isolation) en el backend.
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    job_offer_id INTEGER REFERENCES job_offers(id) ON DELETE CASCADE,
    match_score DECIMAL(3,2) CHECK (match_score BETWEEN 0 AND 1),
    matched_skills TEXT[],
    generated_content TEXT,
    status VARCHAR(20) DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'approved', 'rejected', 'sent')),
    reviewed_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_status VARCHAR(20),
    response_date TIMESTAMP,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS earnings (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    received_date DATE NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount - platform_fee) STORED
);

-- ─── Vista de resumen mensual ──────────────────────────────────

CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
    DATE_TRUNC('month', received_date) as month,
    COUNT(DISTINCT application_id) as projects_completed,
    SUM(net_amount) as total_net_earnings,
    SUM(amount) as total_gross_earnings,
    SUM(platform_fee) as total_fees
FROM earnings
GROUP BY DATE_TRUNC('month', received_date)
ORDER BY month DESC;

-- ─── Índices para mejorar rendimiento ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_job_offers_platform ON job_offers(platform_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_is_relevant ON job_offers(is_relevant);
CREATE INDEX IF NOT EXISTS idx_job_offers_discovered_at ON job_offers(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
-- [BLUE] Fix IDOR: índice para filtrar propuestas por usuario autenticado.
CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_job_offer ON proposals(job_offer_id);
CREATE INDEX IF NOT EXISTS idx_applications_proposal ON applications(proposal_id);
CREATE INDEX IF NOT EXISTS idx_earnings_received_date ON earnings(received_date DESC);

-- Verificar creación
SELECT 'Schema creado exitosamente ✅' as resultado;
