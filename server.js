import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Proxy Endpoint (Substitui o Vercel Serverless Function)
app.get('/api/proxy', async (req, res) => {
    const { url, ...queryParams } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    try {
        const targetUrl = new URL(url);
        Object.keys(queryParams).forEach(key => {
            targetUrl.searchParams.append(key, queryParams[key]);
        });

        console.log(`[Proxy] Forwarding to: ${targetUrl.toString()}`);

        const response = await fetch(targetUrl.toString());

        // Forward status
        res.status(response.status);

        // Forward content type
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Send buffer
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Failed to fetch data', details: error.message });
    }
});

// Serve Static Files (Dist)
// Certifique-se de rodar 'npm run build' antes
app.use(express.static(join(__dirname, 'dist')));

// Fallback para React Router (SPA)
app.use((req, res) => {
    if (req.method === 'GET') {
        res.sendFile(join(__dirname, 'dist', 'index.html'));
    } else {
        res.status(404).end();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT}`);
});
