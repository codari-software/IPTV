import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-proxy',
      configureServer(server) {
        server.middlewares.use('/api/proxy', async (req, res, next) => {
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

            console.log(`[Dev Proxy] Forwarding to: ${targetUrl.toString()}`);

            // Dynamic import to support ESM in CJS context if needed, or just standard import
            const { default: fetch } = await import('node-fetch');
            const response = await fetch(targetUrl.toString());

            res.statusCode = response.status;
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
