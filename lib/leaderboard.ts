import Redis from "ioredis"
import { env } from "../src/env/server.mjs"
const redis = new Redis(env.REDIS_URL)
import { prisma } from "../src/server/db/client"

interface GetRangeOptions {
  set: "top-scores" | "top-streaks"
}

async function getUsers(userIds: string[]) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      image: true,
    },
    where: { id: { in: userIds } },
  })
  return users
}

async function getRange(
  start: number,
  end: number,
  options: GetRangeOptions = { set: "top-scores" }
) {
  const range = await redis.zrevrange(options.set, start, end, "WITHSCORES")

  const scores = range
    .map((userId, index) =>
      index % 2 === 0
        ? { userId, score: Number.parseInt(range[index + 1] as string) }
        : undefined
    )
    .filter(Boolean) as { userId: string; score: number }[]

  return scores
}

export type LeaderboardData = Awaited<ReturnType<typeof getLeaderboard>>

export async function getLeaderboard(firstRank: number, count = 30) {
  const scores = await getRange(firstRank, count)
  const userIds = scores.map((s) => s.userId)
  const users = await getUsers(userIds)

  let currentRank = firstRank
  const leaderboard = scores.map((score, index) => {
    const user = users.find((s) => s.id === score.userId)
    currentRank = firstRank + index + 1

    return {
      ...user,
      ...score,
      rank: currentRank,
    }
  })

  return leaderboard
}

export async function getRelativeLeaderboard(userId: string) {
  const rank = await redis.zrevrank("top-scores", userId)
  if (rank === null) return []

  const scores = await getRange(Math.max(rank - 2, 0), rank + 2)
  const userIds = scores.map((s) => s.userId)

  const rankIndex = userIds.indexOf(userId)
  const firstRank = rank - rankIndex
  const users = await getUsers(userIds)

  let currentRank = firstRank
  const leaderboard = scores.map((score, index) => {
    const user = users.find((s) => s.id === score.userId)
    currentRank = firstRank + index + 1

    return {
      ...user,
      ...score,
      rank: currentRank,
    }
  })

  return leaderboard
}
