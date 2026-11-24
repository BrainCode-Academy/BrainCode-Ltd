import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { config } from './server/config.ts';
import { db } from './server/db.ts';
import { attachWebSocketServer } from './server/realtime.ts';
import { createApiRouter } from './server/routes.ts';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    })
  );

  // SEO robots.txt & dynamic sitemap.xml
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${config.appUrl.replace(/\/+$/, '')}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (_req, res) => {
    const base = config.appUrl.replace(/\/+$/, '');
    const techs = db
      .prepare(`SELECT slug, created_at FROM technologies WHERE is_published = 1 ORDER BY is_popular DESC, sort_order ASC`)
      .all() as Array<{ slug: string; created_at?: string }>;
    const urls = [
      { loc: `${base}/`, priority: '1.0' },
      { loc: `${base}/contact`, priority: '0.8' },
      ...techs.map((t) => ({ loc: `${base}/learn/${encodeURIComponent(t.slug)}`, priority: '0.7' })),
    ];
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map(
          (u) =>
            `  <url>\n    <loc>${u.loc.replace(/&/g, '&amp;')}</loc>\n    <priority>${u.priority}</priority>\n  </url>`
        )
        .join('\n') +
      `\n</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  });

  // Mount API routes
  app.use('/api', createApiRouter());

  // Attach authenticated WebSocket server
  attachWebSocketServer(httpServer);

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(process.cwd(), 'dist');

  if (isProd && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(`Braincode server listening on http://0.0.0.0:${config.port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Braincode server:', err);
  process.exit(1);
});
