import { prisma } from "../src/server/db/client"
/* import Redis from "ioredis" */
/* import { env } from "../src/env/server.mjs" */
/* const redis = new Redis(env.REDIS_URL) */

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    include: { games: true },
    where: { id },
  })
  return user ?? undefined
}
