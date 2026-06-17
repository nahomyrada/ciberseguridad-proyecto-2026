import pool from '../config/database';

export interface Platform {
    id: number;
    name: string;
    base_url: string | null;
    has_api: boolean;
    is_active: boolean;
}

export interface CreatePlatformInput {
    name: string;
    base_url?: string;
    has_api?: boolean;
}

export class PlatformModel {
    static async create(input: CreatePlatformInput): Promise<Platform> {
        const result = await pool.query(
            'INSERT INTO platforms (name, base_url, has_api) VALUES ($1, $2, $3) RETURNING *',
            [input.name, input.base_url || null, input.has_api || false]
        );
        return result.rows[0];
    }

    static async findById(id: number): Promise<Platform | null> {
        const result = await pool.query('SELECT * FROM platforms WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async findAll(): Promise<Platform[]> {
        const result = await pool.query('SELECT * FROM platforms ORDER BY name ASC');
        return result.rows;
    }

    static async update(id: number, data: Partial<Omit<Platform, 'id'>>): Promise<Platform | null> {
        const fields = Object.keys(data);
        if (fields.length === 0) return null;

        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const values = [id, ...Object.values(data)];
        const query = `UPDATE platforms SET ${setClause} WHERE id = $1 RETURNING *`;
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }

    static async delete(id: number): Promise<boolean> {
        const result = await pool.query('DELETE FROM platforms WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
