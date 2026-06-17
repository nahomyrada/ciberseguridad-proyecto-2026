import pool from '../config/database';

export interface JobOffer {
    id: number;
    platform_id: number | null;
    external_id: string | null;
    title: string;
    description: string | null;
    required_skills: string[];
    budget_min: number | null;
    budget_max: number | null;
    currency: string | null;
    client_rating: number | null;
    client_country: string | null;
    posted_date: Date | null;
    deadline_date: Date | null;
    url: string;
    raw_data: object | null;
    discovered_at: Date;
    is_relevant: boolean | null;
    platform?: string;
}

export interface CreateJobOfferInput {
    platform_id?: number;
    external_id?: string;
    title: string;
    description?: string;
    required_skills?: string[];
    budget_min?: number;
    budget_max?: number;
    currency?: string;
    client_rating?: number;
    client_country?: string;
    posted_date?: Date;
    deadline_date?: Date;
    url: string;
    raw_data?: object;
}

export class JobOfferModel {
    static async create(input: CreateJobOfferInput): Promise<JobOffer> {
        const query = `
      INSERT INTO job_offers (
        platform_id, external_id, title, description, required_skills,
        budget_min, budget_max, currency, client_rating, client_country,
        posted_date, deadline_date, url, raw_data
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `;
        const values = [
            input.platform_id || null,
            input.external_id || null,
            input.title,
            input.description || null,
            input.required_skills || [],
            input.budget_min || null,
            input.budget_max || null,
            input.currency || null,
            input.client_rating || null,
            input.client_country || null,
            input.posted_date || null,
            input.deadline_date || null,
            input.url,
            input.raw_data ? JSON.stringify(input.raw_data) : null,
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async findById(id: number): Promise<JobOffer | null> {
        const result = await pool.query('SELECT * FROM job_offers WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async findByExternalId(externalId: string): Promise<JobOffer | null> {
        const result = await pool.query('SELECT * FROM job_offers WHERE external_id = $1', [externalId]);
        return result.rows[0] || null;
    }

    static async findAll(limit = 50, offset = 0): Promise<JobOffer[]> {
        const result = await pool.query(
            'SELECT * FROM job_offers ORDER BY discovered_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        return result.rows;
    }

    static async findPending(): Promise<JobOffer[]> {
        const result = await pool.query(
            'SELECT * FROM job_offers WHERE is_relevant IS NULL ORDER BY discovered_at DESC'
        );
        return result.rows;
    }

    static async update(id: number, data: Partial<JobOffer>): Promise<JobOffer | null> {
        const fields = Object.keys(data).filter((k) => k !== 'id');
        if (fields.length === 0) return null;
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const result = await pool.query(
            `UPDATE job_offers SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...fields.map((f) => (data as Record<string, unknown>)[f])]
        );
        return result.rows[0] || null;
    }

    static async delete(id: number): Promise<boolean> {
        const result = await pool.query('DELETE FROM job_offers WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
