import { prisma } from "../db/client"

export async function claimGames(from: string, to: string) {
  return prisma.game.updateMany({
    where: { userId: from },
    data: { userId: to },
  })
}
