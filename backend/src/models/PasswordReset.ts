import pool from '../config/database';

export interface PasswordReset {
    id: number;
    user_id: number;
    token_hash: string;
    expires_at: Date;
    used: boolean;
    created_at: Date;
}

export class PasswordResetModel {
    // [BLUE] Solo se persiste el hash del token, nunca el valor en claro.
    static async create(userId: number, tokenHash: string, expiresAt: Date): Promise<PasswordReset> {
        const result = await pool.query(
            `INSERT INTO password_resets (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3) RETURNING *`,
            [userId, tokenHash, expiresAt]
        );
        return result.rows[0];
    }

    // Busca un reset válido (no usado, no expirado) que coincida con el hash dado.
    static async findValid(userId: number, tokenHash: string): Promise<PasswordReset | null> {
        const result = await pool.query(
            `SELECT * FROM password_resets
             WHERE user_id = $1 AND token_hash = $2 AND used = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [userId, tokenHash]
        );
        return result.rows[0] || null;
    }

    static async markUsed(id: number): Promise<void> {
        await pool.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [id]);
    }
}
