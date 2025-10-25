import 'dotenv/config';
import {Hono} from 'hono';
import {cors} from 'hono/cors';
import {authRouter} from './routers/authRouter';
import {frontendRouter} from './routers/frontendRouter';

const app = new Hono();

app.use('*', cors({
  origin: '*',
  credentials: true,
}));

app.route('/auth', authRouter);
app.route('/', frontendRouter);

app.get('/health', (c) => c.json({status: 'ok', timestamp: new Date().toISOString()}));

export default app;
