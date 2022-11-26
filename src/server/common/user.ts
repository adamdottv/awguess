import { prisma } from "../db/client"
import Redis from "ioredis"
import { env } from "../../env/server.mjs"
const redis = new Redis(env.REDIS_URL)

export async function claimGames(from: string, to: string) {
  const [newScore, newStreak, currentScore, currentStreak] = await Promise.all([
    redis.zscore("top-scores", from),
    redis.zscore("top-streaks", from),
    redis.zscore("top-scores", to),
    redis.zscore("top-streaks", to),
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
  if (newScore && newScore > (currentScore ?? 0)) {
    promises.push(redis.zadd("top-scores", newScore, to))
  }
  if (newStreak && newStreak > (currentStreak ?? 0)) {
    promises.push(redis.zadd("top-streaks", newStreak, to))
  }
}
