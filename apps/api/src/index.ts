import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'forksquare-api',
    timestamp: new Date().toISOString(),
  });
});

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`ForkSquare API is running on http://localhost:${port}`);
});