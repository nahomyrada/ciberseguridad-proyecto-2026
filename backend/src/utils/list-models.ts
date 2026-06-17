import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function checkModels() {
    try {
        console.log("Consultando modelos disponibles en v1beta...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const response = await axios.get(url);
        console.log("Modelos encontrados:");
        response.data.models.forEach((m: any) => {
            console.log(`- ${m.name} (${m.displayName})`);
        });
    } catch (err: any) {
        console.error("Error al listar modelos:", err.response?.data || err.message);
    }
}

checkModels();
