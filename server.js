import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Streaming Endpoint (Exclusive for Live TV)
app.get('/api/stream', async (req, res) => {
    const { url, ...queryParams } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url' });

    try {
        console.log(`[Stream] Piping: ${url}`);
        const response = await axios.get(url, {
            params: queryParams,
            responseType: 'stream', // Default to stream
            validateStatus: () => true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        res.status(response.status);

        const contentType = response.headers['content-type'];

        // Forward headers
        const headers = ['content-type', 'accept-ranges', 'access-control-allow-origin'];
        Object.keys(response.headers).forEach(key => {
            if (headers.includes(key.toLowerCase())) {
                res.setHeader(key, response.headers[key]);
            }
        });

        // HLS REWRITER LOGIC
        // If it is an m3u8 playlist, we MUST rewrite the internal links to also go through the proxy.
        if (contentType && (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl') || url.includes('.m3u8'))) {
            // We need to read the stream into a string to modify it
            const stream = response.data;
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(Buffer.from(chunk));
            }
            const originalM3u8 = Buffer.concat(chunks).toString('utf-8');

            // Base URL for resolving relative paths
            const urlObj = new URL(url);
            const baseUrl = urlObj.origin + urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);

            // Rewrite Logic
            const modifiedM3u8 = originalM3u8.split('\n').map(line => {
                if (line.trim().startsWith('#') || line.trim() === '') return line; // Skip comments/empty

                // It's a URL (chunk or sub-playlist)
                let lineUrl = line.trim();
                let absoluteUrl;

                if (lineUrl.startsWith('http')) {
                    absoluteUrl = lineUrl;
                } else {
                    // Resolve relative path
                    absoluteUrl = new URL(lineUrl, baseUrl).toString();
                }

                // Point back to OUR proxy
                // We rely on 'host' header to know our own address, or just relative path if same domain
                // Safer to use absolute path matching the incoming request protocol/host
                const protocol = req.headers['x-forwarded-proto'] || req.protocol;
                const host = req.headers.host;
                const proxyUrl = `${protocol}://${host}/api/stream?url=${encodeURIComponent(absoluteUrl)}`;

                return proxyUrl;
            }).join('\n');

            // Send modified content
            res.setHeader('Content-Length', Buffer.byteLength(modifiedM3u8));
            res.send(modifiedM3u8);

        } else {
            // Not a playlist (probably a TS chunk or other video), just pipe it
            response.data.pipe(res);
        }

    } catch (error) {
        console.error('Stream Error:', error.message);
        if (!res.headersSent) res.status(500).end();
    }
});

// Proxy Endpoint (Kept original for VOD stability)
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
