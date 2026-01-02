import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-proxy',
      configureServer(server) {
        // Mock /api/stream for dev
        server.middlewares.use('/api/stream', async (req, res, next) => {
          try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const targetUrlParam = urlObj.searchParams.get('url');

            if (!targetUrlParam) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing "url" query parameter' }));
              return;
            }

            const targetUrl = new URL(targetUrlParam);
            urlObj.searchParams.forEach((value, key) => {
              if (key !== 'url') targetUrl.searchParams.append(key, value);
            });

            console.log(`[Dev Stream] Piping: ${targetUrl.toString()}`);

            // Use axios for consistency with server.js stream logic or fetch
            const { default: fetch } = await import('node-fetch');
            const response = await fetch(targetUrl.toString());

            res.statusCode = response.status;
            // Forward headers
            const headers = ['content-type', 'accept-ranges', 'access-control-allow-origin'];
            response.headers.forEach((val, key) => {
              if (headers.includes(key.toLowerCase())) res.setHeader(key, val);
            });

            // Pipe if possible
            if (response.body && typeof response.body.pipe === "function") {
              response.body.pipe(res);
            } else {
              const buffer = await response.arrayBuffer();
              res.end(Buffer.from(buffer));
            }
          } catch (error) {
            console.error('Stream Error:', error);
            res.statusCode = 500;
            res.end();
          }
        });

        // Mock /api/proxy (Keep existing)
        server.middlewares.use('/api/proxy', async (req, res, next) => {
          try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const targetUrlParam = urlObj.searchParams.get('url');

            // ... (rest of proxy logic)
            if (!targetUrlParam) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing "url" query parameter' }));
              return;
            }

            const targetUrl = new URL(targetUrlParam);
            urlObj.searchParams.forEach((value, key) => {
              if (key !== 'url') targetUrl.searchParams.append(key, value);
            });

            console.log(`[Dev Proxy] Forwarding to: ${targetUrl.toString()}`);

            const { default: fetch } = await import('node-fetch');
            const response = await fetch(targetUrl.toString());

            res.statusCode = response.status;
            // Basic buffer forwarding for VOD
            const contentType = response.headers.get('content-type');
            if (contentType) res.setHeader('Content-Type', contentType);

            const buffer = await response.arrayBuffer();
            res.end(Buffer.from(buffer));
          } catch (error) {
            console.error('Proxy Error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Proxy failed', details: error.message }));
          }
        });
      }
    }
  ],
})
