import type { NextPage } from "next"
import Head from "next/head"
import { inferMutationOutput, trpc } from "../utils/trpc"
import cn from "classnames"
import React from "react"
import { createMachine, assign, actions } from "xstate"
import { useMachine } from "@xstate/react"
import { inspect } from "@xstate/inspect"
import { useTimer } from "react-timer-hook"
const { send, cancel } = actions

if (typeof window !== "undefined") {
  inspect({
    // options
    // url: 'https://stately.ai/viz?inspect', // (default)
    iframe: false, // open in new window
  })
}

type Game = inferMutationOutput<"game.new">
type Round = inferMutationOutput<"game.round">
type Result = inferMutationOutput<"game.answer">

type Context = {
  game?: Game
  round?: Round
  result?: Result
  choice?: string
}

type GameEvent =
  | { type: "START_GAME" }
  | { type: "GUESS"; choice: string }
  | { type: "EXPIRED" }

type GameTypestate =
  | {
    value: "Idle"
    context: Context & {
      game: undefined
      round: undefined
      result: undefined
      choice: undefined
    }
  }
  | { value: "Starting"; context: Context }
  | {
    value: "Active"
    context: Context & {
      game: Game
      round: Round
    }
  }
  | {
    value: { Active: "Guessing" }
    context: Context & {
      game: Game
      round: Round
    }
  }
  | {
    value: { Active: "Checking Answer" }
    context: Context & {
      game: Game
      round: Round
      choice: string
    }
  }
  | {
    value: { Active: "Showing Answer" }
    context: Context & {
      game: Game
      round: Round
      choice: string
      result: Result
    }
  }
  | {
    value: "Game Over"
    context: Context
  }

const gameMachine = createMachine<Context, GameEvent, GameTypestate>({
  id: "Game",
  initial: "Idle",
  predictableActionArguments: true,
  states: {
    Idle: {
      on: {
        START_GAME: {
          target: "Starting",
        },
      },
    },
    "Game Over": {
      on: {
        START_GAME: {
          target: "Starting",
        },
      },
    },
    Starting: {
      invoke: {
        src: "start",
        onDone: [
          {
            target: "Active",
            actions: assign((_context, event) => {
              return {
                game: event.data.game,
                round: event.data.round,
              }
            }),
          },
        ],
      },
    },
    Active: {
      initial: "Guessing",
      on: {
        EXPIRED: {
          target: "Game Over",
        },
      },
      /* after: { */
      /*   expires: { */
      /*     target: "Game Over", */
      /*   }, */
      /* }, */
      states: {
        Guessing: {
          entry: [
            assign({
              choice: undefined,
              result: undefined,
            }),
            send({ type: "EXPIRED" }, { delay: "expires", id: "timer" }),
          ],
          on: {
            GUESS: {
              target: "Checking Answer",
              actions: [
                assign({
                  choice: (_context, event) => {
                    return event.choice
                  },
                }),
                cancel("timer"),
              ],
            },
          },
        },
        "Checking Answer": {
          invoke: {
            src: "answer",
            onDone: [
              {
                target: "Showing Answer",
                actions: assign({
                  result: (_context, event) => event.data,
                  game: (_context, event) => event.data.game,
                }),
              },
            ],
          },
        },
        "Showing Answer": {
          invoke: {
            src: "next",
            onDone: [
              {
                target: "Guessing",
                actions: assign({
                  round: (_context, event) => event.data,
                }),
              },
            ],
          },
        },
      },
    },
  },
})

const Home: NextPage = () => {
  const newGameMutation = trpc.useMutation(["game.new"])
  const newRoundMutation = trpc.useMutation(["game.round"])
  const answerMutation = trpc.useMutation(["game.answer"])

  const { start, pause, resume, restart, seconds } = useTimer({
    expiryTimestamp: new Date(),
  })

  const [current, send] = useMachine(gameMachine, {
    devTools: true,
    delays: {
      expires: (context, event) => {
        console.log(event)
        if (!context.game) return 30
        return context.game.expires.getTime() - Date.now()
      },
    },
    services: {
      start: () => {
        return new Promise(async (resolve) => {
          const game = await newGameMutation.mutateAsync({ name: "test" })
          const round = await newRoundMutation.mutateAsync({ gameId: game.id })

          restart(game.expires)
          resolve({ game, round })
        })
      },
      answer: (context) => {
        return new Promise(async (resolve, reject) => {
          if (!context.round) {
            reject("No current round")
            return
          }

          const response = await answerMutation.mutateAsync({
            roundId: context.round.id,
            choice: context.choice,
          })

          restart(response.game.expires)
          resolve(response)
        })
      },
      next: (context) => {
        return new Promise(async (resolve, reject) => {
          if (!context.round) {
            reject("No current round")
            return
          }

          const start = Date.now()

          const round = await newRoundMutation.mutateAsync({
            gameId: context.round?.gameId,
          })

          const elapsed = Date.now() - start
          const minimumDelay = 2000
          const remaining = minimumDelay - elapsed

          if (remaining > 0) {
            setTimeout(() => {
              resolve(round)
            }, remaining)
          } else {
            resolve(round)
          }
        })
      },
    },
  })
  const { context } = current

  const handleAnswer = React.useCallback(
    async (choice?: string) => {
      if (!context.round || answerMutation.isLoading) return
      send("GUESS", { choice })
    },
    [answerMutation.isLoading, context.round, send]
  )

  async function handleNewGame() {
    send("START_GAME")
    start()
  }

  return (
    <>
      <Head>
        <title>awguess | Everyone&apos;s favorite AWS guessing game</title>
        <meta name="description" content="TBD" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto flex min-h-screen flex-col items-center justify-center p-8">
        {current.matches("Game Over") && (
          <div className="text-3xl text-orange-9">Game Over</div>
        )}
        {(current.matches("Idle") || current.matches("Game Over")) && (
          <Button onClick={handleNewGame}>New Game</Button>
        )}
        {current.matches("Active") && context.round && (
          <div className="flex flex-col items-center justify-center">
            <div className="text-orange-9">{context.game?.score}</div>
            <div className="text-orange-9">{context.game?.streak}</div>
            <div className="text-orange-9">{seconds} seconds</div>
            <div>
              <svg className="icon" aria-hidden="true">
                <use href={`#${context.round.answer.image}`}></use>
              </svg>
            </div>
            <div className="mt-[60px] w-full items-center space-y-6 md:grid md:grid-cols-2 md:grid-rows-2 md:items-stretch md:gap-6 md:space-y-0">
              {context.round.choices.map((c) => {
                const chosen =
                  current.matches({ Active: "Showing Answer" }) &&
                  c.name === context.choice
                const state = current.matches({ Active: "Guessing" })
                  ? undefined
                  : context.result?.answer === c.name
                    ? "success"
                    : "error"

                return (
                  <Button
                    disabled={
                      answerMutation.isLoading ||
                      current.matches({ Active: "Checking Answer" }) ||
                      current.matches({ Active: "Showing Answer" })
                    }
                    key={c.name}
                    className={cn({
                      "relative w-full md:w-64": true,
                    })}
                    state={state}
                    chosen={chosen}
                    onClick={() => handleAnswer(c.name)}
                  >
                    <div className="text-xs font-light uppercase">
                      {c.prefix === "aws" ? "AWS" : "Amazon"}
                    </div>
                    {c.name}
                    {chosen && (
                      <div className="absolute top-3 right-3">
                        {state === "error" && "❌"}
                        {state === "success" && "🎉"}
                      </div>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default Home

interface ButtonProps extends React.ComponentProps<"button"> {
  state?: "success" | "error"
  chosen?: boolean
}

const Button: React.FC<ButtonProps> = ({
  children,
  className,
  state,
  chosen,
  disabled,
  ...props
}) => {
  return (
    <button
      className={cn({
        "relative border-2 bg-blue-3 py-5 px-8 text-lg font-bold": true,
        "border-orange-9 text-orange-9 after:bg-orange-9 hover:border-orange-11 hover:text-orange-11 hover:after:bg-orange-11":
          state === undefined || (state === "error" && !chosen),
        "after:absolute after:top-2 after:left-2 after:-right-2 after:-bottom-2 after:-z-10 after:content-['']":
          true,
        "focus:border-orange-11 focus:outline-none": true,
        "cursor-not-allowed": disabled,
        "pointer-events-none border-green-9 text-green-9 after:bg-green-9 hover:border-green-9 hover:text-green-9 hover:after:bg-green-9":
          state === "success",
        "pointer-events-none border-red-9 text-red-9 after:bg-red-9 hover:border-red-9 hover:text-red-9 hover:after:bg-red-9":
          state === "error" && chosen,
        [className ?? ""]: !!className,
      })}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
