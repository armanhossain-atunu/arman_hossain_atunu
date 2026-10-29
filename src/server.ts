import "dotenv/config";
import { env } from "./config.js";
import { prisma } from "./db.js";
import app from "./app.js";

const server = app.listen(env.PORT, () => {
  console.log(`Portfolio API listening on http://localhost:${env.PORT}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
