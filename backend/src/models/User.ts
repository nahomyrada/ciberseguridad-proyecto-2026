import pool from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    created_at: Date;
}

export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
}

export class UserModel {
    // Crear un nuevo usuario
    static async create(input: CreateUserInput): Promise<User> {
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(input.password, saltRounds);

        const query = `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at
    `;
        const values = [input.username, input.email.toLowerCase(), password_hash];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Buscar usuario por ID
    static async findById(id: number): Promise<User | null> {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    // Buscar usuario por email
    static async findByEmail(email: string): Promise<User | null> {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [
            email.toLowerCase(),
        ]);
        return result.rows[0] || null;
    }

    // Buscar usuario por username
    static async findByUsername(username: string): Promise<User | null> {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return result.rows[0] || null;
    }

    // Obtener todos los usuarios
    static async findAll(): Promise<User[]> {
        const result = await pool.query('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC');
        return result.rows;
    }

    // Actualizar usuario
    static async update(id: number, data: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User | null> {
        const fields = Object.keys(data);
        if (fields.length === 0) return null;

        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const values = [id, ...Object.values(data)];
        const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }

    // Eliminar usuario
    static async delete(id: number): Promise<boolean> {
        const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }

    // Verificar contraseña
    static async verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hash);
    }
}
