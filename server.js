import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Proxy Endpoint
app.get('/api/proxy', async (req, res) => {
    const { url, ...queryParams } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    try {
        console.log(`[Proxy] Requesting: ${url}`);

        const response = await axios.get(url, {
            params: queryParams,
            responseType: 'stream',
            validateStatus: () => true, // Forward all status codes
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Forward Status
        res.status(response.status);

        // Forward Headers
        const headersToForward = ['content-type', 'accept-ranges', 'access-control-allow-origin'];
        Object.keys(response.headers).forEach(header => {
            if (headersToForward.includes(header.toLowerCase())) {
                res.setHeader(header, response.headers[header]);
            }
        });

        // Pipe Data (Axios returns a Node Stream in 'data')
        response.data.pipe(res);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Proxy Request Failed', details: error.message });
        }
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
