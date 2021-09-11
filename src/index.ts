import dotenv from "dotenv"
dotenv.config()
import express from 'express';

import parseTwilioWebhook from './endpoints/parseTwilioWebhook';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

declare global {
  namespace Express {
    interface Request {
      prisma: PrismaClient
    }
  }
}

const app = express();

app.use('*', (req, _res, next) => {
  req.prisma = prisma
  next()
})

app.use(express.urlencoded({ extended: false }));
app.get('/', (req, res) => {
  res.send('Well done!');
})

app.post("/webhook", parseTwilioWebhook)

const port = process.env.PORT || 3005

app.listen(port, () => {
  console.log(`The application is listening on port ${port}!`);
})