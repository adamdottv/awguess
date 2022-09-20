// src/server/router/index.ts
import { createRouter } from "./context"
import superjson from "superjson"
// import fs from "fs"
// import path from "path"
// import crypto from "crypto"

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
    hashed: string
    original: string
  }
  prefix: Prefix
}

// const toPascalCase = (words: string[]) => {
//   return words
//     .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//     .join(" ")
// }
//
// export const resources: Resource[] = fs
//   .readdirSync("./public/images/original/")
//   .map((filename) => {
//     const { name: hyphenatedName } = path.parse(filename)
//     const [prefix, ...fullName] = hyphenatedName.split("-")
//     const formatted = toPascalCase(fullName)
//     const hash = crypto.createHash("md5").update(hyphenatedName).digest("hex")
//
//     return {
//       name: formatted,
//       image: {
//         hashed: `/images/hashed/${hash}.svg`,
//         original: `/images/original/${hyphenatedName}.svg`,
//       },
//       prefix: prefix as Prefix,
//     }
//   })
//
// fs.writeFileSync("./resources.json", JSON.stringify(resources, undefined, 2))
