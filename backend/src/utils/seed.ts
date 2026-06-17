/**
 * Script de seed para insertar datos de prueba
 * Ejecutar con: npm run seed
 */
import pool from '../config/database';
import { UserModel } from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const seed = async () => {
    console.log('🌱 Iniciando seed de datos de prueba...\n');

    try {
        // 1. Crear usuario demo
        console.log('👤 Creando usuario demo...');
        let user;
        const existing = await UserModel.findByEmail('demo@autoapply.com');
        if (!existing) {
            user = await UserModel.create({
                username: 'demo_user',
                email: 'demo@autoapply.com',
                password: 'Demo1234!',
            });
            console.log(`   ✅ Usuario creado: ${user.email}`);
        } else {
            user = existing;
            console.log(`   ℹ️  Usuario ya existe: ${user.email}`);
        }

        // 2. Insertar skills
        console.log('\n🛠️  Insertando skills...');
        const skills = [
            { name: 'TypeScript', category: 'Programming' },
            { name: 'JavaScript', category: 'Programming' },
            { name: 'Python', category: 'Programming' },
            { name: 'Node.js', category: 'Backend' },
            { name: 'Express.js', category: 'Backend' },
            { name: 'PostgreSQL', category: 'Database' },
            { name: 'MongoDB', category: 'Database' },
            { name: 'React', category: 'Frontend' },
            { name: 'Next.js', category: 'Frontend' },
            { name: 'Docker', category: 'DevOps' },
            { name: 'REST API', category: 'Backend' },
            { name: 'GraphQL', category: 'Backend' },
        ];

        for (const skill of skills) {
            await pool.query(
                'INSERT INTO skills (name, category) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
                [skill.name, skill.category]
            );
            console.log(`   ✅ Skill: ${skill.name}`);
        }

        // 3. Asignar skills al usuario demo
        console.log('\n🔗 Asignando skills al usuario demo...');
        const skillsResult = await pool.query('SELECT id, name FROM skills LIMIT 6');
        for (const skill of skillsResult.rows) {
            const proficiency = Math.floor(Math.random() * 4) + 7; // 7-10
            await pool.query(
                `INSERT INTO user_skills (user_id, skill_id, proficiency)
         VALUES ($1, $2, $3) ON CONFLICT (user_id, skill_id) DO NOTHING`,
                [user.id, skill.id, proficiency]
            );
            console.log(`   ✅ ${skill.name} (nivel ${proficiency}/10)`);
        }

        // 4. Insertar plataformas
        console.log('\n🌍 Insertando plataformas...');
        const platforms = [
            { name: 'Freelancer.com', base_url: 'https://www.freelancer.com', has_api: true },
            { name: 'PeoplePerHour', base_url: 'https://www.peopleperhour.com', has_api: false },
            { name: 'Upwork', base_url: 'https://www.upwork.com', has_api: true },
            { name: 'Fiverr', base_url: 'https://www.fiverr.com', has_api: false },
        ];

        for (const platform of platforms) {
            await pool.query(
                `INSERT INTO platforms (name, base_url, has_api)
         VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
                [platform.name, platform.base_url, platform.has_api]
            );
            console.log(`   ✅ ${platform.name}`);
        }

        // 5. Insertar job offers de prueba
        console.log('\n💼 Insertando ofertas de trabajo de prueba...');
        const platformResult = await pool.query("SELECT id FROM platforms WHERE name = 'Freelancer.com'");
        const platformId = platformResult.rows[0]?.id;

        const jobs = [
            {
                title: 'Full-Stack Developer with React & Node.js',
                url: 'https://www.freelancer.com/projects/nodejs/fullstack-dev-001',
                description: 'Looking for an experienced developer to build a SaaS platform...',
                required_skills: ['Node.js', 'React', 'PostgreSQL', 'TypeScript'],
                budget_min: 500,
                budget_max: 1500,
                currency: 'USD',
                client_rating: 4.8,
                client_country: 'United States',
            },
            {
                title: 'TypeScript API Developer for E-commerce Backend',
                url: 'https://www.freelancer.com/projects/typescript/api-dev-002',
                description: 'Need a backend developer to create REST APIs for our e-commerce platform...',
                required_skills: ['TypeScript', 'Express.js', 'PostgreSQL', 'REST API'],
                budget_min: 300,
                budget_max: 800,
                currency: 'USD',
                client_rating: 4.5,
                client_country: 'United Kingdom',
            },
            {
                title: 'Python Script for Web Scraping Automation',
                url: 'https://www.peopleperhour.com/hourlie/python-scraping-003',
                description: 'Automate data collection from multiple websites using Python...',
                required_skills: ['Python', 'Docker'],
                budget_min: 150,
                budget_max: 400,
                currency: 'USD',
                client_rating: 4.2,
                client_country: 'Germany',
            },
        ];

        for (const job of jobs) {
            await pool.query(
                `INSERT INTO job_offers (platform_id, title, url, description, required_skills, budget_min, budget_max, currency, client_rating, client_country)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (url) DO NOTHING`,
                [
                    platformId || null,
                    job.title,
                    job.url,
                    job.description,
                    job.required_skills,
                    job.budget_min,
                    job.budget_max,
                    job.currency,
                    job.client_rating,
                    job.client_country,
                ]
            );
            console.log(`   ✅ ${job.title}`);
        }

        console.log('\n🎉 Seed completado exitosamente!\n');
        console.log('📋 Credenciales de acceso:');
        console.log('   Email:    demo@autoapply.com');
        console.log('   Password: Demo1234!\n');
    } catch (error) {
        console.error('❌ Error durante el seed:', error);
    } finally {
        await pool.end();
    }
};

seed();
