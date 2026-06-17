import pool from './config/database';

const skills = [
    // Web Frontend
    { name: 'React.js', category: 'Frontend' },
    { name: 'Next.js', category: 'Frontend' },
    { name: 'Vue.js', category: 'Frontend' },
    { name: 'Angular', category: 'Frontend' },
    { name: 'Tailwind CSS', category: 'Frontend' },
    { name: 'JavaScript', category: 'Frontend' },
    { name: 'TypeScript', category: 'Frontend' },
    { name: 'HTML5', category: 'Frontend' },
    { name: 'CSS3', category: 'Frontend' },
    { name: 'Web Development', category: 'Frontend' },
    { name: 'Website Design', category: 'Frontend' },

    // Backend
    { name: 'Node.js', category: 'Backend' },
    { name: 'Python', category: 'Backend' },
    { name: 'PHP', category: 'Backend' },
    { name: 'Laravel', category: 'Backend' },
    { name: 'Django', category: 'Backend' },
    { name: 'Express JS', category: 'Backend' },
    { name: 'Go', category: 'Backend' },
    { name: 'Java', category: 'Backend' },
    { name: 'Spring Boot', category: 'Backend' },

    // Mobile
    { name: 'React Native', category: 'Mobile' },
    { name: 'Flutter', category: 'Mobile' },
    { name: 'Swift', category: 'Mobile' },
    { name: 'Kotlin', category: 'Mobile' },
    { name: 'Mobile App Development', category: 'Mobile' },

    // CMS & E-commerce
    { name: 'WordPress', category: 'E-commerce' },
    { name: 'Shopify', category: 'E-commerce' },
    { name: 'WooCommerce', category: 'E-commerce' },
    { name: 'Magento', category: 'E-commerce' },

    // AI & Automation
    { name: 'OpenAI API', category: 'AI & Automation' },
    { name: 'ChatGPT', category: 'AI & Automation' },
    { name: 'Web Scraping', category: 'AI & Automation' },
    { name: 'LangChain', category: 'AI & Automation' },
    { name: 'Machine Learning', category: 'AI & Automation' },
    { name: 'Artificial Intelligence', category: 'AI & Automation' },

    // Databases & DevOps
    { name: 'PostgreSQL', category: 'Database' },
    { name: 'MySQL', category: 'Database' },
    { name: 'MongoDB', category: 'Database' },
    { name: 'Firebase', category: 'Database' },
    { name: 'AWS', category: 'DevOps' },
    { name: 'Docker', category: 'DevOps' },
    { name: 'Google Cloud', category: 'DevOps' },
    { name: 'Azure', category: 'DevOps' },
];

async function seedSkills() {
    console.log('🌱 Iniciando siembra de habilidades profesionales...');
    try {
        for (const skill of skills) {
            await pool.query(
                'INSERT INTO skills (name, category) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET category = $2',
                [skill.name, skill.category]
            );
        }
        console.log('✅ Habilidades sembradas correctamente.');
    } catch (error) {
        console.error('❌ Error sembrando habilidades:', error);
    } finally {
        process.exit();
    }
}

seedSkills();
