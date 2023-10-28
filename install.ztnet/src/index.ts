import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { getBashInstaller } from './routes/getBashInstaller';
import path from 'path';
import { postError } from './routes/postError';

const errorRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 10, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many error reports submitted, please try again after an hour\n',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const getRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 1500, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: "echo 'Too many installation requests, please try again after an hour\n'",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const app = express();
app.enable('trust proxy');
app.set('trust proxy', 'loopback');

http.createServer(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.get('/health', getHealthLimiter, getHealth);
// app.get('/bin', getRateLimiter, getBinary);
app.get('(/)?', getRateLimiter, getBashInstaller);
app.post('/post/error', errorRateLimiter, postError);
app.get('*', (_, res) => res.download(path.join(__dirname, '..', 'bash/error.sh'), 'error.sh'));

app.listen(9090, () => {
  console.log('running:: ', process.env.NODE_ENV);
  console.log('Backend server listen at: ' + 9090);
});
