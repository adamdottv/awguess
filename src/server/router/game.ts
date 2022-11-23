import { createRouter } from "./context"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import resources from "../../../data/resources.json"
import { TRPCError } from "@trpc/server"
import Redis from "ioredis"
import { env } from "../../env/server.mjs"

const duration = 20
const roundDelay = 2
const correctBonus = 2
const incorrectPenalty = -5

const redis = new Redis(env.REDIS_URL)

export const gameRouter = createRouter()
  .mutation("new", {
    async resolve({ ctx }) {
      const start = new Date()
      const expires = new Date()
      expires.setSeconds(expires.getSeconds() + duration)

      const game = await ctx.prisma.game.create({
        data: { start, expires, userId: ctx.session?.user?.id },
      })
      const round = await createRound(ctx.prisma, game.id)

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

      // Older scores should be ranked higher than
      // new scores with the same value.
      const biggest = 9999999999999
      const startTime = game.start.getTime()
      const suffix = biggest - startTime

      await Promise.all([
        ctx.prisma.game.update({
          data: { userId: ctx.session?.user?.id, complete: true },
          where: { id: input.gameId },
        }),
        redis.zadd("scores", `${game.score}.${suffix}`, game.id),
        redis.zadd("streaks", `${game.longest}.${suffix}`, game.id),
      ])

      return getRelativeLeaderboard(ctx.prisma, game.id)
    },
  })
  .query("leaderboard", {
    input: z
      .object({ gameId: z.string().nullish(), page: z.number().nullish() })
      .nullish(),
    async resolve({ ctx, input }) {
      if (input?.gameId) {
        return getRelativeLeaderboard(ctx.prisma, input.gameId)
      }

      const pageSize = 30
      const skip = input?.page ? input.page * pageSize : 0
      const page = await ctx.prisma.game.findMany({
        select: {
          id: true,
          score: true,
          longest: true,
          userId: true,
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
        orderBy: [{ score: "desc" }, { start: "asc" }],
        skip,
        take: pageSize,
      })

      return page.map((score, index) => ({
        ...score,
        rank: skip + index + 1,
      }))
    },
  })

async function getRelativeLeaderboard(prisma: PrismaClient, gameId: string) {
  const rank = await redis.zrevrank("scores", gameId)
  if (rank === null) return []

  const range = await redis.zrevrange("scores", Math.max(rank - 2, 0), rank + 2)
  const rankIndex = range.indexOf(gameId)
  const firstRank = rank - rankIndex
  const scores = await getScores(prisma, range)

  let currentRank = firstRank
  const leaderboard = range.map((gameId, index) => {
    // Trying to implement ties, but poorly.
    // https://github.com/redis/redis/issues/943
    /* const previousGameId = range[index - 1] */
    /* const previous = scores.find((s) => s.id === previousGameId) */
    const score = scores.find((s) => s.id === gameId)
    /* const tie = previous && previous.score === score?.score */
    /* const previousRank = currentRank */
    currentRank = firstRank + index + 1

    return {
      ...score,
      rank: currentRank,
      /* rank: tie ? previousRank : currentRank, */
    }
  })

  return leaderboard
}

async function getScores(prisma: PrismaClient, gameIds: string[]) {
  const games = await prisma.game.findMany({
    select: {
      id: true,
      score: true,
      longest: true,
      userId: true,
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
    where: { id: { in: gameIds } },
  })
  return games
}

async function createRound(prisma: PrismaClient, gameId: string) {
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

  const start = new Date()
  start.setSeconds(start.getSeconds() + roundDelay)

  const round = await prisma.round.create({
    data: { gameId: gameId, answer: answer!.name, start },
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

function getRandomItem<T>(array: T[]) {
  return array[Math.floor(Math.random() * array.length)] as T
}
