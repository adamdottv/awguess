import { createRouter } from "./context"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import resources from "../../../data/resources.json"

function getRandomItem<T>(array: T[]) {
  return array[Math.floor(Math.random() * array.length)] as T
}

async function createRound(prisma: PrismaClient, gameId: string) {
  const first = getRandomItem(resources)
  const second = getRandomItem(resources.filter((r) => r.name !== first.name))
  const third = getRandomItem(
    resources.filter((r) => r.name !== first.name && r.name !== second.name)
  )
  const fourth = getRandomItem(
    resources.filter(
      (r) =>
        r.name !== first.name && r.name !== second.name && r.name !== third.name
    )
  )
  const choices = [first, second, third, fourth]
  const answer = getRandomItem(choices)
  const { d } = answer
  const { stop1Color, stop2Color } = answer.image

  const start = new Date()

  const round = await prisma.round.create({
    data: { gameId: gameId, answer: answer.name, start },
  })

  return {
    ...round,
    answer: { d, stop1Color, stop2Color },
    choices: choices.map(({ name, prefix }) => ({
      name,
      prefix,
    })),
  }
}

export const gameRouter = createRouter()
  .mutation("new", {
    input: z.object({
      name: z.string().min(1),
    }),
    async resolve({ ctx, input }) {
      const start = new Date()
      const expires = new Date()
      expires.setSeconds(expires.getSeconds() + 45)

      const game = await ctx.prisma.game.create({
        data: { name: input.name, score: 0, start, expires },
      })
      return game
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
      const scoreDelta = correct && !expired ? streak : 0
      const expiresDelta = correct && !expired ? 5 : -5
      const expires = new Date(round.game.expires)

      if (!expired) expires.setSeconds(expires.getSeconds() + expiresDelta)

      const roundUpdate = ctx.prisma.round.update({
        data: { choice, end: new Date(end) },
        where: { id: round.id },
      })

      const gameUpdate = ctx.prisma.game.update({
        data: { score: { increment: scoreDelta }, expires, streak },
        where: { id: round.gameId },
      })

      console.time("await transaction")
      const [, game] = await ctx.prisma.$transaction([roundUpdate, gameUpdate])
      console.timeEnd("await transaction")

      return {
        correct,
        answer,
        expired,
        game,
        scoreDelta,
        expiresDelta,
      }
    },
  })
