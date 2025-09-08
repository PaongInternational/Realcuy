import { createClient } from '@supabase/supabase-js';

// Pastikan variabel lingkungan ini diatur di Vercel
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Klien Supabase (untuk akses database)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function handleVisitorTracking(request) {
    const ip = request.headers.get('x-forwarded-for') || request.connection.remoteAddress;
    const userAgent = request.headers.get('user-agent');
    
    // Mencegah insert data jika IP sudah ada untuk hari ini
    const { data } = await supabase
        .from('visitors')
        .select('id')
        .eq('ip_address', ip)
        .gte('timestamp', new Date().toISOString().slice(0, 10));

    if (!data || data.length === 0) {
        await supabase
            .from('visitors')
            .insert({ ip_address: ip, user_agent: userAgent, timestamp: new Date().toISOString() });
    }
}

function serveWebsite(request) {
    handleVisitorTracking(request);

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PaongDev - Deployer V1.0</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { font-family: 'Inter', sans-serif; }
                .card {
                    background-color: #1a202c; border: 1px solid #2d3748; border-radius: 0.5rem;
                    padding: 1.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .btn {
                    padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600;
                    transition: all 0.2s ease-in-out;
                }
                .btn-primary { background-color: #4299e1; color: white; }
                .btn-primary:hover { background-color: #3182ce; }
                .input-field {
                    background-color: #2d3748; color: white; border: 1px solid #4a5568;
                    border-radius: 0.5rem; padding: 0.75rem; width: 100%;
                }
            </style>
        </head>
        <body class="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
            <div class="container mx-auto max-w-2xl">
                <div class="card">
                    <h1 class="text-3xl font-bold mb-4">PaongDev Deployer V1.0</h1>
                    <p class="text-gray-400 mb-6">
                        Selamat datang di PaongDev, alat deployment proyek Anda ke GitHub.
                    </p>
                    <form id="deployForm" class="space-y-4">
                        <div class="flex flex-col md:flex-row gap-4">
                            <input type="text" id="githubUsername" name="username" placeholder="Nama Pengguna GitHub" class="input-field flex-1">
                            <input type="text" id="repoName" name="repoName" placeholder="Nama Repositori Baru" class="input-field flex-1">
                        </div>
                        <label for="projectZip" class="block text-sm font-medium text-gray-300">Unggah file .zip proyek Anda:</label>
                        <input type="file" id="projectZip" name="file" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer">
                        <button type="submit" class="btn btn-primary w-full">Deploy Proyek</button>
                    </form>
                    <div id="statusMessage" class="mt-4 p-4 rounded-md text-sm font-medium hidden"></div>
                    <hr class="my-6 border-gray-700">
                    <div class="space-y-4">
                        <h2 class="text-xl font-bold">Tanya Bot AI PaongDev</h2>
                        <textarea id="aiPrompt" rows="4" placeholder="Tulis pertanyaan Anda di sini..." class="input-field"></textarea>
                        <button id="askAiBtn" class="btn btn-primary w-full">Tanya Bot</button>
                        <div id="aiResponse" class="bg-gray-800 p-4 rounded-md whitespace-pre-wrap"></div>
                    </div>
                    <hr class="my-6 border-gray-700">
                    <div class="space-y-4">
                        <h2 class="text-xl font-bold">Proyek yang Di-deploy</h2>
                        <ul id="projectList" class="space-y-2"></ul>
                    </div>
                </div>
            </div>
            <script>
                async function fetchProjects() {
                    const { data, error } = await supabase.from('projects').select('title, description, created_at');
                    if (error) { console.error('Gagal memuat proyek:', error.message); return; }
                    const projectList = document.getElementById('projectList');
                    projectList.innerHTML = '';
                    data.forEach(project => {
                        const li = document.createElement('li');
                        li.className = 'p-4 bg-gray-800 rounded-md';
                        li.innerHTML = \`<p class="font-semibold">\${project.title}</p><p class="text-gray-400 text-sm">\${project.description}</p>\`;
                        projectList.appendChild(li);
                    });
                }
                document.getElementById('deployForm').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const statusMessage = document.getElementById('statusMessage');
                    statusMessage.classList.add('hidden');
                    statusMessage.className = 'mt-4 p-4 rounded-md text-sm font-medium';
                    statusMessage.textContent = 'Mulai deployment...';
                    statusMessage.classList.remove('hidden');
                    const form = e.target;
                    const formData = new FormData(form);
                    try {
                        const response = await fetch('/api/deploy', { method: 'POST', body: formData });
                        const result = await response.text();
                        if (response.ok) {
                            statusMessage.textContent = result;
                            statusMessage.classList.add('bg-green-500', 'text-white');
                            fetchProjects();
                        } else {
                            statusMessage.textContent = \`Gagal deploy: \${result}\`;
                            statusMessage.classList.add('bg-red-500', 'text-white');
                        }
                    } catch (error) {
                        statusMessage.textContent = 'Terjadi kesalahan jaringan atau server.';
                        statusMessage.classList.add('bg-red-500', 'text-white');
                    }
                });
                document.getElementById('askAiBtn').addEventListener('click', async function() {
                    const prompt = document.getElementById('aiPrompt').value;
                    const aiResponseDiv = document.getElementById('aiResponse');
                    aiResponseDiv.textContent = 'Bot sedang berpikir...';
                    try {
                        const response = await fetch('/api/bot-ai', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt: prompt })
                        });
                        const result = await response.json();
                        if (response.ok) {
                            aiResponseDiv.textContent = result.response;
                        } else {
                            aiResponseDiv.textContent = \`Error: \${result.error}\`;
                        }
                    } catch (error) {
                        aiResponseDiv.textContent = 'Terjadi kesalahan saat menghubungi bot.';
                    }
                });
                const supabase = window.supabase;
                window.onload = fetchProjects;
            </script>
        </body>
        </html>
    `;
    return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html' },
    });
}

export default (request) => {
    return serveWebsite(request);
};
