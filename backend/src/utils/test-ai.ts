import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function listModels() {
    try {
        // Note: The SDK might not have a direct listModels method on genAI, 
        // we might need to use the fetch API or just try common names.
        // Actually, gemini-pro is the most reliable one.
        console.log("Intentando listar modelos o probar gemini-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hola");
        console.log("Conexión con gemini-pro exitosa:", result.response.text());
    } catch (err: any) {
        console.error("Error con gemini-pro:", err.message);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        const result = await model.generateContent("Hola");
        console.log("Conexión con gemini-1.0-pro exitosa:", result.response.text());
    } catch (err: any) {
        console.error("Error con gemini-1.0-pro:", err.message);
    }
}

listModels();
