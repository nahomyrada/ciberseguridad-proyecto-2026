import { GoogleGenerativeAI } from '@google/generative-ai';
import { JobOffer } from '../models/JobOffer';
import { Skill } from '../models/Skill';

export class AIService {
    private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    private static model = AIService.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    /**
     * Genera una propuesta de trabajo personalizada utilizando Gemini.
     */
    static async generateProposal(job: JobOffer, userSkills: (Skill & { proficiency: number })[]): Promise<string> {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY no configurada en el servidor');
        }

        const skillsContext = userSkills
            .map(s => `- ${s.name} (Nivel: ${s.proficiency}/10)`)
            .join('\n');

        const prompt = `
Actúa como un experto en redacción de propuestas para freelancers.
Escribe una propuesta persuasiva, profesional y concisa para el siguiente trabajo:

DATOS DEL TRABAJO:
Título: ${job.title}
Descripción: ${job.description}
Habilidades requeridas: ${job.required_skills.join(', ')}

MI PERFIL (Skills y nivel):
${skillsContext}

INSTRUCCIONES:
1. Usa un tono profesional pero cercano.
2. Enfócate en cómo mis habilidades resuelven los problemas específicos mencionados en la descripción.
3. No uses placeholders genéricos como [Nombre]. Asume que yo revisaré y completaré los detalles finales.
4. Sé breve (máximo 250 palabras).
5. Escribe la propuesta en el mismo idioma que la descripción del trabajo (si está en inglés, escribe en inglés; si está en español, escribe en español).
6. No incluyas saludos o despedidas genéricas pesadas, ve al grano sobre mi valor.

PROPUESTA:
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error: any) {
            console.error('Error detallado de Gemini:', {
                message: error.message,
                status: error.status,
                details: error.response?.data
            });
            throw new Error(`Error de Gemini: ${error.message || 'Error desconocido'}`);
        }
    }
}
