import pool from '../config/database';

export interface Earning {
    id: number;
    application_id: number;
    amount: number;
    currency: string;
    received_date: Date;
    platform_fee: number;
    net_amount: number;
}

export interface CreateEarningInput {
    application_id: number;
    amount: number;
    currency: string;
    received_date: Date;
    platform_fee: number;
}

export class EarningModel {
    static async create(input: CreateEarningInput): Promise<Earning> {
        //const net_amount = input.amount - input.platform_fee;
        const result = await pool.query(
            `INSERT INTO earnings (application_id, amount, currency, received_date, platform_fee)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [
                input.application_id,
                input.amount,
                input.currency,
                input.received_date,
                input.platform_fee,
            ]
        );
        return result.rows[0];
    }

    static async findById(id: number): Promise<Earning | null> {
        const result = await pool.query('SELECT * FROM earnings WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async findAll(): Promise<Earning[]> {
        const result = await pool.query('SELECT * FROM earnings ORDER BY received_date DESC');
        return result.rows;
    }

    static async getMonthlySummary(): Promise<object[]> {
        const result = await pool.query('SELECT * FROM monthly_summary');
        return result.rows;
    }

    static async update(id: number, data: Partial<Earning>): Promise<Earning | null> {
        const fields = Object.keys(data).filter((k) => k !== 'id');
        if (fields.length === 0) return null;
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const result = await pool.query(
            `UPDATE earnings SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...fields.map((f) => (data as Record<string, unknown>)[f])]
        );
        return result.rows[0] || null;
    }

    static async delete(id: number): Promise<boolean> {
        const result = await pool.query('DELETE FROM earnings WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
