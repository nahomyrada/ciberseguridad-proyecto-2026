import pool from '../config/database';

export interface Skill {
    id: number;
    name: string;
    category: string | null;
    is_active: boolean;
}

export class SkillModel {
    static async create(name: string, category?: string): Promise<Skill> {
        const result = await pool.query(
            'INSERT INTO skills (name, category) VALUES ($1, $2) RETURNING *',
            [name, category || null]
        );
        return result.rows[0];
    }

    static async findById(id: number): Promise<Skill | null> {
        const result = await pool.query('SELECT * FROM skills WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async findAll(onlyActive = true): Promise<Skill[]> {
        const query = onlyActive
            ? 'SELECT * FROM skills WHERE is_active = true ORDER BY category, name'
            : 'SELECT * FROM skills ORDER BY category, name';
        const result = await pool.query(query);
        return result.rows;
    }

    static async update(id: number, data: Partial<Omit<Skill, 'id'>>): Promise<Skill | null> {
        const fields = Object.keys(data);
        if (fields.length === 0) return null;
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const result = await pool.query(
            `UPDATE skills SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...Object.values(data)]
        );
        return result.rows[0] || null;
    }

    static async delete(id: number): Promise<boolean> {
        const result = await pool.query('DELETE FROM skills WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }

    // Habilidades de un usuario
    static async findByUser(userId: number): Promise<(Skill & { proficiency: number })[]> {
        const result = await pool.query(
            `SELECT s.*, us.proficiency
       FROM skills s
       JOIN user_skills us ON s.id = us.skill_id
       WHERE us.user_id = $1 AND s.is_active = true
       ORDER BY s.category, s.name`,
            [userId]
        );
        return result.rows;
    }

    // Asignar habilidad a usuario
    static async assignToUser(userId: number, skillId: number, proficiency: number): Promise<void> {
        await pool.query(
            `INSERT INTO user_skills (user_id, skill_id, proficiency)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, skill_id) DO UPDATE SET proficiency = $3`,
            [userId, skillId, proficiency]
        );
    }
}
