import pool from '../config/database';

export interface Proposal {
    id: number;
    job_offer_id: number;
    match_score: number | null;
    matched_skills: string[];
    generated_content: string | null;
    status: 'pending_review' | 'approved' | 'rejected' | 'sent';
    reviewed_at: Date | null;
    sent_at: Date | null;
    created_at: Date;
}

export interface CreateProposalInput {
    job_offer_id: number;
    match_score?: number;
    matched_skills?: string[];
    generated_content?: string;
}

export class ProposalModel {
    static async create(input: CreateProposalInput): Promise<Proposal> {
        const query = `
      INSERT INTO proposals (job_offer_id, match_score, matched_skills, generated_content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
        const result = await pool.query(query, [
            input.job_offer_id,
            input.match_score || null,
            input.matched_skills || [],
            input.generated_content || null,
        ]);
        return result.rows[0];
    }

    static async findById(id: number): Promise<Proposal | null> {
        const result = await pool.query(
            `SELECT p.*, jo.title as job_title, jo.url as job_url
       FROM proposals p
       LEFT JOIN job_offers jo ON p.job_offer_id = jo.id
       WHERE p.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    static async findByJobOffer(jobOfferId: number): Promise<Proposal | null> {
        const result = await pool.query(
            'SELECT * FROM proposals WHERE job_offer_id = $1',
            [jobOfferId]
        );
        return result.rows[0] || null;
    }

    static async findAll(status?: string): Promise<Proposal[]> {
        const query = `
      SELECT p.*, jo.title as job_title, jo.url as job_url
      FROM proposals p
      LEFT JOIN job_offers jo ON p.job_offer_id = jo.id
      ${status ? 'WHERE p.status = $1' : ''}
      ORDER BY p.created_at DESC
    `;
        const result = await pool.query(query, status ? [status] : []);
        return result.rows;
    }

    static async updateStatus(id: number, status: Proposal['status']): Promise<Proposal | null> {
        const extra = status === 'sent' ? ', sent_at = NOW()' : status === 'approved' ? ', reviewed_at = NOW()' : '';
        const result = await pool.query(
            `UPDATE proposals SET status = $2${extra} WHERE id = $1 RETURNING *`,
            [id, status]
        );
        return result.rows[0] || null;
    }

    static async update(id: number, data: Partial<Proposal>): Promise<Proposal | null> {
        const fields = Object.keys(data).filter((k) => k !== 'id');
        if (fields.length === 0) return null;
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const result = await pool.query(
            `UPDATE proposals SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...fields.map((f) => (data as Record<string, unknown>)[f])]
        );
        return result.rows[0] || null;
    }

    static async delete(id: number): Promise<boolean> {
        const result = await pool.query('DELETE FROM proposals WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
