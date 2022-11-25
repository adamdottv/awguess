import { createRouter } from "./context"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import resources from "../../../data/resources.json"
import { TRPCError } from "@trpc/server"
import Redis from "ioredis"
import { env } from "../../env/server.mjs"
import { getRandomItem } from "../common/game"

const duration = 30
const gameDelay = 10
const roundDelay = 2
const correctBonus = 3
const incorrectPenalty = -5

const redis = new Redis(env.REDIS_URL)

export const gameRouter = createRouter()
  .mutation("new", {
    async resolve({ ctx }) {
      const start = new Date()
      start.setSeconds(start.getSeconds() + gameDelay)
      const expires = new Date(start)
      expires.setSeconds(expires.getSeconds() + duration)

      const game = await ctx.prisma.game.create({
        data: { start, expires, userId: ctx.session?.user?.id },
      })
      const round = await createRound(ctx.prisma, game.id, start)

      return {
        game,
        round,
      }
    },
  })
  .mutation("round", {
    input: z.object({
      gameId: z.string().min(1),
    }),
    resolve({ ctx, input }) {
      return createRound(ctx.prisma, input.gameId)
    },
  })
  .mutation("answer", {
    input: z.object({
      roundId: z.string().min(1),
      choice: z.string().optional(),
    }),
    async resolve({ ctx, input }) {
      const { roundId, choice } = input
      console.time("findUnique")
      const round = await ctx.prisma.round.findUnique({
        where: { id: roundId },
        include: { game: true },
      })
      if (!round) throw new Error("Couldn't find round")
      console.timeEnd("findUnique")

      const { answer } = round

      const end = Date.now()
      const expired = end >= round.game.expires.getTime()
      const correct = round.answer === choice

      const streak = correct ? (round.game.streak ?? 0) + 1 : 0
      const longest = Math.max(streak, round.game.longest ?? 0)
      const scoreDelta = correct && !expired ? streak : 0
      const expiresDelta = correct && !expired ? correctBonus : incorrectPenalty
      const expires = new Date(round.game.expires)

      if (!expired) {
        expires.setSeconds(expires.getSeconds() + expiresDelta + roundDelay)
      }

      const roundUpdate = ctx.prisma.round.update({
        data: { choice, end: new Date(end) },
        where: { id: round.id },
      })

      const gameUpdate = ctx.prisma.game.update({
        data: {
          score: { increment: scoreDelta },
          expires,
          streak,
          longest,
          complete: expired,
        },
        where: { id: round.gameId },
      })

      console.time("await transaction")
      const [, game] = await ctx.prisma.$transaction([roundUpdate, gameUpdate])
      console.timeEnd("await transaction")

      const next = expired
        ? undefined
        : await createRound(ctx.prisma, round.gameId)

      return {
        correct,
        answer,
        expired,
        game,
        scoreDelta,
        expiresDelta,
        next,
      }
    },
  })
  .mutation("finalize", {
    input: z.object({ gameId: z.string() }),
    async resolve({ ctx, input }) {
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
      })
      if (!game) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not find game with provided ID",
        })
      }

      const [score, streak] = await Promise.all([
        redis.zscore("top-scores", game.userId),
        redis.zscore("top-streaks", game.userId),
      ])

      const topScore = Number.parseInt(score ?? "0")
      const topStreak = Number.parseInt(streak ?? "0")

      const promises: Promise<unknown>[] = [
        ctx.prisma.game.update({
          data: { userId: ctx.session?.user?.id, complete: true },
          where: { id: input.gameId },
        }),
      ]
      if (game.score > topScore) {
        promises.push(redis.zadd("top-scores", game.score, game.userId))
      }
      if (game.streak > topStreak) {
        promises.push(redis.zadd("top-streaks", game.streak, game.userId))
      }

      await Promise.all(promises)
      return getRelativeLeaderboard(ctx.prisma, game.userId)
    },
  })
  .query("leaderboard", {
    input: z
      .object({ userId: z.string().nullish(), page: z.number().nullish() })
      .nullish(),
    async resolve({ ctx, input }) {
      if (input?.userId) {
        return getRelativeLeaderboard(ctx.prisma, input.userId)
      }

      const pageSize = 30
      const start = input?.page ? input.page * pageSize : 0
      return getLeaderboard(ctx.prisma, start, pageSize)
    },
  })

async function getRelativeLeaderboard(prisma: PrismaClient, userId: string) {
  const rank = await redis.zrevrank("top-scores", userId)
  if (rank === null) return []

  const scores = await getRange(Math.max(rank - 2, 0), rank + 2)
  const userIds = scores.map((s) => s.userId)

  const rankIndex = userIds.indexOf(userId)
  const firstRank = rank - rankIndex
  const users = await getUsers(prisma, userIds)

  let currentRank = firstRank
  const leaderboard = scores.map((score, index) => {
    const user = users.find((s) => s.id === score.userId)
    currentRank = firstRank + index + 1

    return {
      ...user,
      score: score.score,
      rank: currentRank,
    }
  })

  return leaderboard
}

async function getLeaderboard(
  prisma: PrismaClient,
  firstRank: number,
  count = 30
) {
  const scores = await getRange(firstRank, count)
  const userIds = scores.map((s) => s.userId)
  const users = await getUsers(prisma, userIds)

  let currentRank = firstRank
  const leaderboard = scores.map((score, index) => {
    const user = users.find((s) => s.id === score.userId)
    currentRank = firstRank + index + 1

    return {
      ...user,
      score: score.score,
      rank: currentRank,
    }
  })

  return leaderboard
}

interface GetRangeOptions {
  set: "top-scores" | "top-streaks"
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

async function getUsers(prisma: PrismaClient, userIds: string[]) {
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

async function createRound(
  prisma: PrismaClient,
  gameId: string,
  delayedStart?: Date
) {
  const choices = [getRandomItem(resources)]
  for (let index = 0; index < 3; index++) {
    choices.push(
      getRandomItem(
        resources.filter(
          (r) =>
            !choices.find((c) => c.name === r.name) &&
            (index > 0 || choices[0]?.category === r.category)
        )
      )
    )
  }

  const answer = choices[0]
  const { d } = answer!
  const { stop1Color, stop2Color } = answer!.image

  const start = delayedStart ?? new Date()
  start.setSeconds(start.getSeconds() + roundDelay)

  const round = await prisma.round.create({
    data: { gameId, answer: answer!.name, start },
  })

  return {
    ...round,
    answer: { d, stop1Color, stop2Color },
    choices: shuffle(choices).map(({ name, prefix }) => ({
      name,
      prefix,
    })),
  }
}

function shuffle<T>(array: Array<T>) {
  let currentIndex = array.length
  let randomIndex

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

      // And swap it with the current element.
      ;[array[currentIndex], array[randomIndex]] = [
        array[randomIndex] as T,
        array[currentIndex] as T,
      ]
  }

  return array
}
