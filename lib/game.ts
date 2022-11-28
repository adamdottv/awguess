
import { prisma } from "../src/server/db/client"
/* import Redis from "ioredis" */
/* import { env } from "../src/env/server.mjs" */
/* const redis = new Redis(env.REDIS_URL) */

export async function getGame(id: string) {
  const game = await prisma.game.findUnique({ include: {
    rounds: true,
    user: true
  }, where: { id }})
  return game ?? undefined
}
