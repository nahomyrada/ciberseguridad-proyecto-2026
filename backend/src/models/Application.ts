import pool from '../config/database';

export interface Application {
    id: number;
    proposal_id: number;
    sent_date: Date;
    response_status: string | null;
    response_date: Date | null;
    notes: string | null;
}

export class ApplicationModel {
    static async create(proposal_id: number, notes?: string): Promise<Application> {
        const result = await pool.query(
            'INSERT INTO applications (proposal_id, notes) VALUES ($1, $2) RETURNING *',
            [proposal_id, notes || null]
        );
        return result.rows[0];
    }

    static async findById(id: number): Promise<Application | null> {
        const result = await pool.query(
            `SELECT a.*, p.generated_content, jo.title as job_title
       FROM applications a
       LEFT JOIN proposals p ON a.proposal_id = p.id
       LEFT JOIN job_offers jo ON p.job_offer_id = jo.id
       WHERE a.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    static async findAll(): Promise<Application[]> {
        const result = await pool.query(
            `SELECT a.*, p.generated_content, jo.title as job_title
       FROM applications a
       LEFT JOIN proposals p ON a.proposal_id = p.id
       LEFT JOIN job_offers jo ON p.job_offer_id = jo.id
       ORDER BY a.sent_date DESC`
        );
        return result.rows;
    }

    static async updateResponse(
        id: number,
        response_status: string,
        notes?: string
    ): Promise<Application | null> {
        const result = await pool.query(
            `UPDATE applications
       SET response_status = $2, response_date = NOW(), notes = COALESCE($3, notes)
       WHERE id = $1 RETURNING *`,
            [id, response_status, notes || null]
        );
        return result.rows[0] || null;
    }

    static async delete(id: number): Promise<boolean> {
        const result = await pool.query('DELETE FROM applications WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
