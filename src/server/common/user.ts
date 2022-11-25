import { prisma } from "../db/client"
import Redis from "ioredis"
import { env } from "../../env/server.mjs"
const redis = new Redis(env.REDIS_URL)

export async function claimGames(from: string, to: string) {
  const [score, streak] = await Promise.all([
    redis.zscore("top-scores", from),
    redis.zscore("top-streaks", from),
  ])

  const promises: Promise<unknown>[] = []
  promises.push(
    prisma.game.updateMany({
      where: { userId: from },
      data: { userId: to },
    }),
    redis.zrem("top-scores", from),
    redis.zrem("top-streaks", from)
  )
  if (score) promises.push(redis.zadd("top-scores", score, to))
  if (streak) promises.push(redis.zadd("top-streaks", streak, to))
}
