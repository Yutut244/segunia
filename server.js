// server.js - Servidor de Desarrollo Local y Producción para SeguIA
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Cargar variables de entorno
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
  }
} catch (e) {}

const handleApiRequest = require('./api/index');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, pathname) {
  let cleanPath = pathname === '/' ? 'index.html' : pathname;
  if (cleanPath === '/app' || cleanPath === 'app') {
    cleanPath = 'app.html';
  }
  let filePath = path.join(PUBLIC_DIR, cleanPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Acceso denegado');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Archivo no encontrado');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // Si es una ruta de API, delegar al manejador unificado de Vercel
  if (pathname.startsWith('/api/')) {
    return handleApiRequest(req, res);
  }

  // De lo contrario, servir archivos estáticos
  return serveStatic(req, res, pathname);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` SeguIA - Sistema Inteligente de Seguimiento Académico`);
    console.log(` "La IA propone, los datos sustentan y el docente decide."`);
    console.log(` Autores: Cristóbal Martínez & Jainer Salas`);
    console.log(` Base de datos: Supabase PostgreSQL (En la nube)`);
    console.log(` Servidor local activo en: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = { server, PORT };
