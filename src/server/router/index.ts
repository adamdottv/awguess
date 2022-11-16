// src/server/router/index.ts
import { createRouter } from "./context"
import superjson from "superjson"
import { gameRouter } from "./game"
import { protectedExampleRouter } from "./protected-example-router"

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("game.", gameRouter)
  .merge("auth.", protectedExampleRouter)

// export type definition of API
export type AppRouter = typeof appRouter

export type Prefix = "aws" | "amazon"

export type Resource = {
  name: string
  image: {
    hash: string
    hashed: string
    original: string
  }
  prefix: Prefix
}
