import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';
import JSZip from 'jszip';
import formidable from 'formidable';

// Pastikan variabel lingkungan ini diatur di Vercel
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Klien Supabase & GitHub
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const octokit = new Octokit({ auth: GITHUB_TOKEN });

function sanitizeInput(fields) {
    const sanitized = {};
    for (const key in fields) {
        if (Object.hasOwnProperty.call(fields, key)) {
            const value = String(fields[key]).replace(/<\/?[^>]+(>|$)/g, "");
            sanitized[key] = value;
        }
    }
    return sanitized;
}

export default async function (request) {
    if (request.method !== 'POST') {
        return new Response('Metode tidak diizinkan', { status: 405 });
    }

    const form = formidable({});
    const [fields, files] = await form.parse(request);

    try {
        const sanitizedFields = sanitizeInput(fields);
        const { username, repoName } = sanitizedFields;

        if (!username || !repoName || !files['file'][0]) {
            return new Response('Data tidak lengkap.', { status: 400 });
        }

        const zipFile = files['file'][0];
        const zip = new JSZip();
        const zipData = await zipFile.arrayBuffer();
        const loadedZip = await zip.loadAsync(zipData);

        const filePromises = [];
        loadedZip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
                filePromises.push(
                    zipEntry.async('string').then(content => ({
                        path: relativePath,
                        content: content
                    }))
                );
            }
        });

        const extractedFiles = await Promise.all(filePromises);

        for (const file of extractedFiles) {
            await octokit.repos.createOrUpdateFileContents({
                owner: username,
                repo: repoName,
                path: file.path,
                message: `Menambahkan file ${file.path} via PaongDev`,
                content: Buffer.from(file.content).toString('base64'),
                committer: {
                    name: 'PaongDev',
                    email: 'paongdev@example.com'
                },
                author: {
                    name: 'PaongDev',
                    email: 'paongdev@example.com'
                }
            });
        }

        return new Response('Proyek berhasil di-deploy!', { status: 200 });

    } catch (e) {
        console.error("Kesalahan deployment:", e);
        return new Response(`Kesalahan deployment: ${e.message}`, { status: 500 });
    }
                      }
