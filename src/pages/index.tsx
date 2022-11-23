import type { NextPage } from "next"
import dynamic from "next/dynamic"
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
import { Leaderboard } from "../components/leaderboard"
import { Layout } from "../components/layout"
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
            gameId: context.game.id,
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
  const leaderboardQuery = trpc.useQuery(
    ["game.leaderboard", { gameId: context.game?.id }],
    { enabled: Boolean(context.finalized) }
  )

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
    <Layout>
      {current.matches("Idle") && (
        <Button onClick={handleNewGame}>New Game</Button>
      )}
      {current.matches("Active") && context.round && (
        <div className="flex flex-col mt-3 md:flex-row md:space-x-12 justify-center items-center">
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
                    className={`absolute -top-[10px] -left-[6px] animate-appear text-lg ${
                      context.result.expiresDelta > 0
                        ? "text-green-11"
                        : "text-red-11"
                    }`}
                  >
                    {`${context.result.expiresDelta > 0 ? "+" : ""}${
                      context.result.expiresDelta
                    }`}
                  </div>
                )}
              </div>
              <div className="text-sm mt-[2px]">timer</div>
            </div>
            <div className="absolute -top-5 -right-5 flex">
              <div className="text-sm mt-[2px]">score</div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-2 bg-orange-9">
                <div className="text-lg text-orange-12">
                  {context.game?.score}
                </div>
                {!!context.result?.scoreDelta && (
                  <div className="absolute -top-[10px] -right-[6px] animate-appear text-lg text-green-11">
                    {`${context.result.scoreDelta > 0 ? "+" : ""}${
                      context.result.scoreDelta
                    }`}
                  </div>
                )}
              </div>
            </div>
            {(context.game?.streak ?? 0) > 1 && (
              <div className="absolute -bottom-5 -right-5 flex items-end">
                <div className="text-sm mt-[2px]">streak</div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-2 bg-orange-9">
                  <div className="text-lg text-blue-12">
                    {context.game?.streak}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-[40px] w-full items-center space-y-6 md:mt-0">
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
                  {/* <div className="absolute top-3 left-3 text-orange-8"> */}
                  {/*   {index + 1} */}
                  {/* </div> */}
                </Button>
              )
            })}
          </div>
        </div>
      )}
      {current.matches("Game Over") && (
        <div className="flex-col items-center text-center space-y-10">
          <div className="flex-col space-y-1">
            <div className="text-4xl">Game Over</div>
            <div className="text-2xl">
              Score:
              <span className="text-4xl text-blue-9 ml-2">
                {context.game?.score}
              </span>
            </div>
          </div>
          <Button full className="text-2xl" onClick={handleNewGame}>
            Play Again
          </Button>
          {context.finalized && (
            <div className="flex flex-col space-y-2">
              <Leaderboard
                data={leaderboardQuery.data ?? context.finalized}
                gameId={context.game?.id}
              />
              <Link href="/leaderboard">View full leaderboard</Link>
            </div>
          )}
          <div>
            {!session?.user?.email && (
              <div className="flex flex-col space-y-2 items-center">
                <div>Signin to claim your score!</div>
                <button
                  className="inline-flex space-x-2 items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-[#1DA1F2] hover:bg-[#34aaf3] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1DA1F2]"
                  onClick={() => signIn("twitter")}
                >
                  <svg
                    role="img"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    className="fill-current h-5"
                  >
                    <title>Twitter</title>
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                  <span>Sign in with Twitter</span>
                </button>
                <button
                  className="inline-flex space-x-2 items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-[#0A66C2] hover:bg-[#0c75df] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A66C2]"
                  onClick={() => signIn("linkedin")}
                >
                  <svg
                    role="img"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    className="fill-current h-5"
                  >
                    <title>LinkedIn</title>
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <span>Sign in with LinkedIn</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
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

  return <div className="text-lg text-orange-12">{seconds}</div>
}

interface ButtonProps extends React.ComponentProps<"button"> {
  state?: "success" | "error"
  chosen?: boolean
  full?: boolean
}

const Button: React.FC<ButtonProps> = ({
  children,
  className,
  state,
  chosen,
  disabled,
  full,
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
        "w-full": full,
        [className ?? ""]: !!className,
      })}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
