const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger');

const app = express();
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((value) => value.trim());
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'] } } }));
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 1000 : 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiados intentos. Probá nuevamente en unos minutos.' } });
app.use('/api/auth/registro', authLimiter);
app.use('/api/auth/login', authLimiter);

app.get('/', (_req, res) => res.json({ mensaje: 'API de ServiMap funcionando' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/auth', require('./routes/authRouter'));
app.use('/api/oficios', require('./routes/oficiosRouter'));
app.use('/api/prestadores', require('./routes/prestadoresRouter'));
app.use('/api/clientes', require('./routes/clientesRouter'));
app.use('/api/solicitudes', require('./routes/solicitudesRouter'));
app.use('/api/calificaciones', require('./routes/calificacionesRouter'));

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({ error: error.message || 'Error interno', ...(error.details ? { details: error.details } : {}) });
});

module.exports = app;
