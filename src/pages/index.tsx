import type { NextPage } from "next"
import dynamic from "next/dynamic"
import Head from "next/head"
import { inferMutationOutput, trpc } from "../utils/trpc"
import cn from "classnames"
import React from "react"
import Confetti from "js-confetti"
import {
  createMachine,
  assign,
  actions,
  State,
  ServiceMap,
  BaseActionObject,
  ResolveTypegenMeta,
  TypegenDisabled,
} from "xstate"
import { useMachine } from "@xstate/react"
import { signIn, useSession } from "next-auth/react"
import Link from "next/link"
const { send, cancel } = actions

const confetti = typeof window !== "undefined" ? new Confetti() : undefined

type NewGame = inferMutationOutput<"game.new">
type Game = NewGame["game"]
type Result = inferMutationOutput<"game.answer">
type Round = Result["next"]
type Finalized = inferMutationOutput<"game.finalize">

type Context = {
  game?: Game
  round?: Round
  next?: Round
  result?: Result
  choice?: string
  finalized?: Finalized
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
      next: Round
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
      entry: ["confetti"],
      invoke: {
        src: "finalize",
        onDone: [
          {
            actions: assign((_ctx, event) => {
              return {
                finalized: event.data,
              }
            }),
          },
        ],
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
                finalized: undefined,
              }
            }),
          },
        ],
      },
    },
    Active: {
      initial: "Guessing",
      on: { EXPIRED: { target: "Game Over" } },
      states: {
        Guessing: {
          entry: [
            assign({
              choice: undefined,
              result: undefined,
              finalized: undefined,
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
                  next: (_context, event) => event.data.next,
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
                cond: (_ctx, event) => !!event.data,
                actions: assign({ round: (_ctx, event) => event.data }),
              },
              {
                target: "#Game.Game Over",
                cond: (_ctx, event) => !event.data,
              },
            ],
          },
        },
      },
    },
  },
})

let previousState: State<Context, GameEvent, GameTypestate>
if (typeof window !== "undefined") {
  const serializedState = localStorage.getItem("game-machine-state")
  if (serializedState) {
    previousState = JSON.parse(serializedState)
  }
}

const Home: NextPage = () => {
  return (
    <NonSSRWrapper>
      <Game />
    </NonSSRWrapper>
  )
}

export default Home

const NonSSRWrapperInner: React.FC<React.PropsWithChildren> = ({
  children,
}) => <React.Fragment>{children}</React.Fragment>
const NonSSRWrapper = dynamic(() => Promise.resolve(NonSSRWrapperInner), {
  ssr: false,
})

const Game: React.FC = () => {
  const { data: session, status } = useSession()
  React.useEffect(() => {
    if (status === "unauthenticated") {
      signIn("anon", { redirect: false })
    }
  }, [status])

  const newGameMutation = trpc.useMutation(["game.new"])
  const answerMutation = trpc.useMutation(["game.answer"])
  const finalizeMutation = trpc.useMutation(["game.finalize"])

  const [current, send, service] = useMachine(gameMachine, {
    /* state: previousState?.value === "Game Over" ? undefined : previousState, */
    state: previousState,
    delays: {
      expires: (context) => {
        if (!context.game) return 30
        return new Date(context.game.expires).getTime() - Date.now()
      },
    },
    actions: {
      confetti: (context) => {
        confetti?.addConfetti({
          confettiColors: [
            "#0a4481",
            "#0954a5",
            "#0091ff",
            "#369eff",
            "#52a9ff",
            /* "#eaf6ff", */
            "#763205",
            "#943e00",
            "#f76808",
            "#ff802b",
            "#ff8b3e",
            /* "#feeadd", */
          ],
          emojis: (context.game?.score ?? 0) === 0 ? ["💩"] : undefined,
        })
      },
    },
    services: {
      start: () => {
        return new Promise(async (resolve) => {
          const { game, round } = await newGameMutation.mutateAsync()
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

          resolve(response)
        })
      },
      next: (context) => {
        return new Promise(async (resolve) => {
          if (!context.next) {
            resolve(undefined)
            return
          }

          const round = context.next
          const remaining = new Date(round.start).getTime() - Date.now()
          if (remaining > 0) {
            setTimeout(() => resolve(round), remaining)
          } else {
            resolve(round)
          }
        })
      },
      finalize: (context) => {
        return new Promise(async (resolve) => {
          if (!context.game) {
            resolve(undefined)
            return
          }

          const finalized = await finalizeMutation.mutateAsync({
            gameId: context.game?.id,
          })
          resolve(finalized)
        })
      },
    },
  })

  service.onTransition((state) => {
    try {
      localStorage.setItem("game-machine-state", JSON.stringify(state))
    } catch (e) {
      console.error("Unable to save to localStorage")
    }
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
  }

  const { stop1Color, stop2Color, d } = context.round?.answer ?? {}
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="a" x1="0%" x2="100%" y1="100%" y2="0%"><stop offset="0%" stop-color="${stop1Color}"/><stop offset="100%" stop-color="${stop2Color}"/></linearGradient></defs><g fill="none" fill-rule="evenodd"><path fill="url(#a)" d="M0 0h80v80H0z"/><path fill="#FFF" d="${d}"/></g></svg>`

  return (
    <>
      <Head>
        <title>awguess | Everyone&apos;s favorite AWS guessing game</title>
        <meta
          name="description"
          content="Everyone's favorite AWS guessing game!"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto max-w-sm flex min-h-screen flex-col justify-center p-8 text-orange-9">
        <div className="h-18 flex items-center justify-center absolute top-0 inset-x-0">
          <img src="/logo.svg" alt="awguess" className="h-12" />
        </div>
        {current.matches("Idle") && (
          <Button onClick={handleNewGame}>New Game</Button>
        )}
        {current.matches("Active") && context.round && (
          <div className="flex flex-col items-center justify-center">
            <div className="relative aspect-square w-full">
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
                className="h-full w-full"
              />
              <div className="absolute -top-5 -left-5 flex">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-2 bg-orange-9">
                  <Timer state={current} />
                  {!!context.result?.expiresDelta && (
                    <div
                      className={`absolute -top-[10px] -left-[6px] animate-appear text-lg ${context.result.expiresDelta > 0
                          ? "text-green-11"
                          : "text-red-11"
                        }`}
                    >
                      {`${context.result.expiresDelta > 0 ? "+" : ""}${context.result.expiresDelta
                        }`}
                    </div>
                  )}
                </div>
                <div className="text-sm mt-[2px]">timer</div>
              </div>
              <div className="absolute -top-5 -right-5 flex">
                <div className="text-sm mt-[2px]">score</div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-2 bg-orange-9">
                  <div className="text-lg text-white">
                    {context.game?.score}
                  </div>
                  {!!context.result?.scoreDelta && (
                    <div className="absolute -top-[10px] -right-[6px] animate-appear text-lg text-green-11">
                      {`${context.result.scoreDelta > 0 ? "+" : ""}${context.result.scoreDelta
                        }`}
                    </div>
                  )}
                </div>
              </div>
              {(context.game?.streak ?? 0) > 1 && (
                <div className="absolute -bottom-5 -right-5 flex items-end">
                  <div className="text-sm mt-[2px]">streak</div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-2 bg-orange-9">
                    <div className="text-lg text-white">
                      {context.game?.streak}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-[40px] w-full items-center space-y-6">
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
                      "relative w-full text-xl leading-4": true,
                    })}
                    state={state}
                    chosen={chosen}
                    onClick={() => handleAnswer(c.name)}
                  >
                    <div className="text-sm font-light uppercase opacity-80">
                      {c.prefix === "aws" ? "AWS" : "Amazon"}
                    </div>
                    {c.name}
                    {/* {chosen && ( */}
                    {/*   <div className="absolute top-3 right-3"> */}
                    {/*     {state === "error" && "❌"} */}
                    {/*     {state === "success" && "🎉"} */}
                    {/*   </div> */}
                    {/* )} */}
                  </Button>
                )
              })}
            </div>
          </div>
        )}
        {current.matches("Game Over") && (
          <div className="flex-col items-center text-center space-y-8">
            <div className="flex-col space-y-1">
              <div className="text-4xl">Game Over</div>
              <div className="text-2xl">
                Score:{" "}
                <span className="text-4xl text-blue-9">
                  {context.game?.score}
                </span>
              </div>
            </div>
            {context.finalized && (
              <div className="flex flex-col space-y-2">
                <table className="table-auto w-full border-spacing-y-1 border-separate">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>User</th>
                      <th>Score</th>
                    </tr>
                  </thead>

                  <tbody>
                    {context.finalized?.map((score) => (
                      <tr
                        key={score.id}
                        className={cn({
                          "h-10": true,
                          "bg-blue-6 outline outline-blue-9":
                            score.id === context.game?.id,
                          "bg-blue-3": score.id !== context.game?.id,
                        })}
                      >
                        <td>{score.rank}</td>
                        <td>
                          <div className="flex space-x-2 items-center justify-center">
                            {score.user && (
                              <img
                                src={score.user.image!}
                                alt={score.user.name!}
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <div>{score.user?.name ?? "Anonymous"}</div>
                          </div>
                        </td>
                        <td>{score.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Link href="/leaderboard">View full leaderboard</Link>
              </div>
            )}
            <div>
              {!session && (
                <div>
                  <div>Signin to add your score to the leaderboard!</div>
                  <button onClick={() => signIn("twitter")}>
                    Sign in with Twitter
                  </button>
                </div>
              )}
            </div>
            <Button onClick={handleNewGame}>Play Again</Button>
          </div>
        )}
      </main>
    </>
  )
}

interface TimerProps {
  state: State<
    Context,
    GameEvent,
    any,
    GameTypestate,
    ResolveTypegenMeta<TypegenDisabled, GameEvent, BaseActionObject, ServiceMap>
  >
}

const Timer: React.FC<TimerProps> = ({ state }) => {
  const { context } = state

  const [seconds, setSeconds] = React.useState(0)
  const requestRef = React.useRef<number>()
  const lastSeconds = React.useRef<number>()

  const animate = () => {
    if (!context.game?.expires) {
      setSeconds(0)
      return
    } else if (state.matches({ Active: "Guessing" })) {
      const newSeconds = Math.max(
        Math.round(
          (new Date(context.game?.expires).getTime() - Date.now()) / 1000
        ),
        0
      )
      setSeconds(newSeconds)
      lastSeconds.current = newSeconds
    } else if (state.matches({ Active: "Showing Answer" })) {
      if (!lastSeconds.current || !context.result) return
      setSeconds(lastSeconds.current + context.result.expiresDelta)
    }

    requestRef.current = requestAnimationFrame(animate)
  }

  React.useEffect(() => {
    requestRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(requestRef.current!)
  }, [state.value, context.game?.expires])

  return <div className="text-lg text-white">{seconds}</div>
}

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
        "border-orange-9 after:bg-orange-9 hover:border-orange-11 hover:text-orange-11 hover:after:bg-orange-11":
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
