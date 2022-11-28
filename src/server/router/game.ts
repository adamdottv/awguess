import { createRouter } from "./context"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import resources from "../../../data/resources.json"
import { TRPCError } from "@trpc/server"
import Redis from "ioredis"
import { env } from "../../env/server.mjs"
import { getRandomItem } from "../common/game"
import {
  getLeaderboard,
  getRelativeLeaderboard,
} from "../../../lib/leaderboard"

const duration = 30
const gameDelay = 6
const roundDelay = 2
const correctBonus = 3
const maxStreakBonus = 10
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
      const round = await createRound(ctx.prisma, game.id, {
        delayedStart: start,
      })

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
      choice: z.string().min(1),
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
      const scoreDelta =
        correct && !expired ? Math.min(streak, maxStreakBonus) : 0
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
        : await createRound(ctx.prisma, round.gameId, { streak })

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

      if (game.score >= topScore) {
        promises.push(redis.zadd("top-scores", game.score, game.userId))
      }
      if (game.longest >= topStreak) {
        promises.push(redis.zadd("top-streaks", game.longest, game.userId))
      }

      await Promise.all(promises)
      return getRelativeLeaderboard(game.userId)
    },
  })
  .query("leaderboard", {
    input: z
      .object({ userId: z.string().nullish(), page: z.number().nullish() })
      .nullish(),
    async resolve({ ctx, input }) {
      if (input?.userId) {
        return getRelativeLeaderboard(input.userId)
      }

      const pageSize = 30
      const start = input?.page ? input.page * pageSize : 0
      return getLeaderboard(start, pageSize)
    },
  })

interface CreateRoundOptions {
  delayedStart?: Date
  streak?: number
}

async function createRound(
  prisma: PrismaClient,
  gameId: string,
  options?: CreateRoundOptions
) {
  const streak = options?.streak ?? 0
  const answer = getRandomItem(resources)
  const choices = [answer]
  const numberOfSameCategory =
    streak >= 16 ? 4 : streak >= 12 ? 3 : streak >= 8 ? 2 : streak >= 4 ? 1 : 0

  const category = answer?.category
  const subcategory = answer?.subcategory

  for (let index = 0; index < 3; index++) {
    const others = resources.filter(
      (r) => !choices.find((c) => c.name === r.name)
    )

    const choice = getRandomItem(
      others.filter(
        (r) =>
          index > numberOfSameCategory ||
          (subcategory
            ? subcategory === r.subcategory
            : category === r.category)
      )
    )
    choices.push(choice ?? getRandomItem(others))
  }

  const { d } = answer
  const { stop1Color, stop2Color } = answer.image

  const start = options?.delayedStart ?? new Date()
  start.setSeconds(start.getSeconds() + roundDelay)

  const round = await prisma.round.create({
    data: { gameId, answer: answer.id, start },
  })

  return {
    ...round,
    answer: { d, stop1Color, stop2Color },
    choices: shuffle(choices).map(({ id, name, prefix }) => ({
      id,
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
