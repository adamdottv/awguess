import { PrismaClient } from "@prisma/client"
import Redis from "ioredis"

const redis = new Redis(
  "rediss://default:f7db6eeb136b4af3a650b3198e081bfe@global-lasting-corgi-32373.upstash.io:32373"
)

export const prisma = new PrismaClient({
  log: ["error"],
  /* env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"], */
})

const users = await prisma.user.findMany({
  select: { id: true },
})

for (const user of users) {
  const userId = user.id
  const highScore = await prisma.game.findFirst({
    select: { score: true },
    where: { userId },
    orderBy: [{ score: "desc" }],
  })
  console.log(highScore)
  await redis.zadd("top-scores", highScore.score, userId)

  const highStreak = await prisma.game.findFirst({
    select: { streak: true },
    where: { userId },
    orderBy: [{ streak: "desc" }],
  })
  console.log(highStreak)
  await redis.zadd("top-streaks", highStreak.streak, userId)
}
