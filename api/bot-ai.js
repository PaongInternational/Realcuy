import { GoogleGenerativeAI } from '@google/generative-ai';

// Pastikan variabel lingkungan ini diatur di Vercel
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Klien Gemini (untuk bot AI)
const gemini = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });

export default async function (request) {
    if (request.method !== 'POST') {
        return new Response('Metode tidak diizinkan', { status: 405 });
    }

    const { prompt } = await request.json();

    if (!prompt) {
        return new Response(JSON.stringify({ error: "Prompt tidak boleh kosong." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return new Response(JSON.stringify({ response: text }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error("Kesalahan AI:", e);
        return new Response(JSON.stringify({ error: "Terjadi kesalahan saat menghubungi bot." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
