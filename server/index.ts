import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers/_app';
import { createContext } from './trpc';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// tRPC middleware
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get('/', (req, res) => {
  res.send('CynexAI Backend API is running');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
