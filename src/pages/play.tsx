import type { NextPage } from "next"
import dynamic from "next/dynamic"
import { inferMutationOutput, trpc } from "../utils/trpc"
import cn from "classnames"
import React, { ComponentProps, useEffect, useState } from "react"
import Confetti from "js-confetti"
import ReCAPTCHA from "react-google-recaptcha"
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
import { Button } from "../components/button"
import Nav from "../components/nav"
import { env } from "../env/client.mjs"
const { send, cancel } = actions
const sitekey = env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY

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
  validate?: boolean
  token?: string
}

type GameEvent =
  | { type: "START_GAME" }
  | { type: "GUESS"; choice: string }
  | { type: "EXPIRED" }
  | { type: "VALIDATE"; valid: boolean }

type GameTypestate =
  | { value: "Starting"; context: Context }
  | { value: "Countdown"; context: Context }
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
    value: "Validating"
    context: Context
  }
  | {
    value: "Game Over"
    context: Context
  }

const gameMachine = createMachine<Context, GameEvent, GameTypestate>({
  id: "Game",
  initial: "Starting",
  predictableActionArguments: true,
  states: {
    Validating: {
      on: {
        VALIDATE: [
          {
            target: "Game Over",
            cond: (_context, event) => event.valid,
          },
          {
            target: "Disqualified",
            cond: (_context, event) => !event.valid,
          },
        ],
      },
    },
    Disqualified: {
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
            target: "Countdown",
            actions: assign((_context, event) => {
              return {
                game: event.data.game,
                round: event.data.round,
                validate: false,
                finalized: undefined,
              }
            }),
          },
        ],
      },
    },
    Countdown: {
      after: { countdown: { target: "Active" } },
    },
    Active: {
      initial: "Guessing",
      on: {
        EXPIRED: [
          {
            target: "Validating",
            cond: (context) => Boolean(context.validate),
          },
          {
            target: "Game Over",
          },
        ],
      },
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
                  validate: (_context, event) => event.data.validate,
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
                target: "#Game.Validating",
                cond: (ctx, event) => !event.data && Boolean(ctx.validate),
              },
              {
                target: "#Game.Game Over",
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
  const serializedState = localStorage.getItem("game-state")
  if (serializedState) {
    previousState = JSON.parse(serializedState)
  }
}

const Home: NextPage = () => {
  return (
    <Layout>
      <NonSSRWrapper>
        <Game />
      </NonSSRWrapper>
    </Layout>
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
  const [showSignIn, setShowSignin] = useState(false)
  const isAnonymous = !session?.user?.email

  React.useEffect(() => {
    if (status === "unauthenticated") {
      signIn("anon", { redirect: false })
    }
    setShowSignin(status === "authenticated")
  }, [status])

  const newGameMutation = trpc.useMutation(["game.new"])
  const answerMutation = trpc.useMutation(["game.answer"])
  const validateMutation = trpc.useMutation(["game.validate"])
  const finalizeMutation = trpc.useMutation(["game.finalize"])

  const [current, send, service] = useMachine(gameMachine, {
    state: previousState,
    /* previousState?.value === "Game Over" && !router.query.claimed */
    /*   ? undefined */
    /*   : previousState, */
    delays: {
      countdown: (context) => {
        if (!context.round) return 3000
        return new Date(context.round.start).getTime() - Date.now()
      },
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
          const remaining = new Date(game.start).getTime() - Date.now() - 1000

          if (remaining > 0) {
            setTimeout(() => resolve({ game, round }), remaining)
          } else {
            resolve({ game, round })
          }
        })
      },
      answer: (context) => {
        return new Promise(async (resolve, reject) => {
          if (!context.round || !context.choice) {
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
      finalize: (context, event) => {
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
      localStorage.setItem("game-state", JSON.stringify(state))
    } catch (e) {
      console.error("Unable to save to localStorage")
    }
  })

  const { context } = current
  const leaderboardQuery = trpc.useQuery(
    ["game.leaderboard", { userId: context.game?.userId }],
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

  async function handleRecaptchaChange(value: string | null) {
    if (!context.game || !value) return

    console.log(value)
    const valid = await validateMutation.mutateAsync({
      gameId: context.game?.id,
      token: value,
    })
    send("VALIDATE", { valid })
  }

  return (
    <>
      <Nav
        className={cn({
          "hidden md:block": current.matches("Active"),
        })}
      />
      <main className="container mx-auto max-w-sm md:max-w-3xl p-8 text-orange-9">
        {current.matches("Starting") && <Starting />}
        {current.matches("Countdown") && <Countdown context={context} />}
        {current.matches("Active") && (
          <Round current={current} handleAnswer={handleAnswer} />
        )}
        {current.matches("Validating") && (
          <ReCAPTCHA
            sitekey={sitekey}
            theme="dark"
            onChange={handleRecaptchaChange}
          />
        )}
        {current.matches("Game Over") && (
          <div className="flex-col items-center justify-center text-center space-y-10">
            <div className="flex-col space-y-1 font-display uppercase">
              <div className="text-4xl font-bold">Game Over</div>
              <div className="text-2xl font-semibold">
                Score:
                <span className="text-4xl text-blue-9 ml-2 font-bold">
                  {context.game?.score}
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <Button full className="text-2xl" onClick={handleNewGame}>
                Play Again
              </Button>
              <Button
                full
                secondary
                as="link"
                href={{
                  pathname: "/game/[id]",
                  query: { id: context.game?.id },
                }}
              >
                View Recap
              </Button>
            </div>
            {context.finalized && (
              <div className="flex flex-col space-y-2">
                <Leaderboard
                  data={leaderboardQuery.data ?? context.finalized}
                  userId={context.game?.userId}
                />
                <Link href="/leaderboard">View full leaderboard</Link>
              </div>
            )}
            {showSignIn && isAnonymous && (
              <div>
                <div className="flex flex-col space-y-4 items-center">
                  <div>Sign in to claim your score!</div>
                  <Button
                    full
                    color="bg-[#1DA1F2]"
                    darker="#0a73b3"
                    darkest="#064266"
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
                  </Button>
                  <Button
                    full
                    color="bg-[#0A66C2]"
                    darker="#074788"
                    darkest="#04294e"
                    onClick={() =>
                      signIn("linkedin", { callbackUrl: "/play?claimed=true" })
                    }
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
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}

interface Quote {
  quote: string
  name: string
  title: string
}

const quotes: Quote[] = [
  {
    quote:
      "The secret to getting a high score on awguess? Simple. Be right, a lot.",
    name: "Jeff Bezos",
    title: "Founder and Executive Chairman of Amazon",
  },
  {
    quote:
      "Happiness is when what you think, what you say, and what you do are in harmony. Also, playing awguess.",
    name: "Mahatma Gandhi",
    title: "Really Famous Person",
  },
  {
    quote:
      "There are only two things I accomplished in life that I'm proud of. Being put on Mount Rushmore and my score of 76 on awguess.",
    name: "Theodore Roosevelt",
    title: "26th President of the United States",
  },
  {
    quote:
      "If at first you don't succeed, you might just be bad at this. I mean, there's A LOT of AWS Services.",
    name: "Robert the Bruce",
    title: "King of Scotland",
  },
  {
    quote:
      "Do not go where the path may lead, go instead to awguess.com and leave a score.",
    name: "Ralph Waldo Emerson",
    title: "American Essayist",
  },
  {
    quote:
      "When you reach the end of your rope, just guess. Seriously, nobody will see this, amirite?",
    name: "Franklin D. Roosevelt",
    title: "32nd President of the United States",
  },
]

const Starting: React.FC<ComponentProps<"div">> = (props) => {
  const [quote, setQuote] = React.useState<Quote>()

  useEffect(() => {
    const index = Number.parseInt(window.localStorage.getItem("quote") ?? "0")
    setQuote(quotes[index])

    window.localStorage.setItem(
      "quote",
      (index + 1 > quotes.length - 1 ? 0 : index + 1).toString()
    )
  }, [])

  if (!quote) return null

  return (
    <div
      className="bg-blue-7 rounded-3xl p-5 md:relative md:z-10 md:pb-0"
      {...props}
    >
      <div className="md:mx-auto md:grid md:max-w-7xl md:grid-cols-3 md:gap-8 md:px-8">
        <div className="md:col-span-2 md:m-0 md:pl-8">
          <div className="mx-auto max-w-md px-4 sm:max-w-2xl sm:px-6 md:max-w-none md:px-0 md:py-20">
            <blockquote>
              <div>
                <svg
                  className="h-12 w-12 text-blue-12 opacity-25"
                  fill="currentColor"
                  viewBox="0 0 32 32"
                  aria-hidden="true"
                >
                  <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                </svg>
                <p className="mt-6 text-xl md:text-2xl font-medium text-blue-12">
                  {quote.quote}
                </p>
              </div>
              <footer className="mt-6">
                <p className="text-base font-medium text-blue-12">
                  {quote.name}
                </p>
                <p className="text-base font-medium text-blue-11">
                  {quote.title}
                </p>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  )
}

const Countdown: React.FC<ComponentProps<"div"> & { context: Context }> = ({
  context,
  ...props
}) => {
  const [step, setStep] = useState(1)
  const duration = context.round
    ? new Date(context.round.start).getTime() - Date.now()
    : 3000

  useEffect(() => {
    const handle = setTimeout(() => {
      if (step === 3) return
      setStep((step) => step + 1)
    }, duration / 4)

    return () => clearTimeout(handle)
  }, [duration, step])

  return (
    <div
      className="font-display italic font-black uppercase absolute inset-5 flex items-center justify-center text-5xl md:text-7xl text-center text-orange-9"
      {...props}
    >
      {step === 1 && <div className="animate-pop">Ready</div>}
      {step === 2 && <div className="animate-pop">Set</div>}
      {step === 3 && <div className="animate-pop">Guess</div>}
    </div>
  )
}

interface RoundProps extends ComponentProps<"div"> {
  current: State<
    Context,
    GameEvent,
    never,
    GameTypestate,
    ResolveTypegenMeta<TypegenDisabled, GameEvent, BaseActionObject, ServiceMap>
  >
  handleAnswer: (choice?: string) => Promise<void>
}

const Round: React.FC<RoundProps> = ({ current, handleAnswer, ...props }) => {
  const { context } = current
  const { stop1Color, stop2Color, d } = context.round?.answer ?? {}
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="a" x1="0%" x2="100%" y1="100%" y2="0%"><stop offset="0%" stop-color="${stop1Color}"/><stop offset="100%" stop-color="${stop2Color}"/></linearGradient></defs><g fill="none" fill-rule="evenodd"><path fill="url(#a)" d="M0 0h80v80H0z"/><path fill="#FFF" d="${d}"/></g></svg>`

  return (
    <div className="flex flex-col md:mt-3 md:flex-row md:space-x-12" {...props}>
      <div className="relative aspect-square md:w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
          alt="aws service"
          className="h-full w-full"
        />
        <div className="absolute -top-5 -left-5 flex">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-blue-2 bg-orange-9">
            {!!context.result?.expiresDelta ? (
              <div
                className={`animate-pop duration-500 text-lg font-bold text-orange-12 `}
              >
                {`${context.result.expiresDelta > 0 ? "+" : ""}${context.result.expiresDelta
                  }`}
              </div>
            ) : (
              <Timer state={current} />
            )}
          </div>
          <div className="text-sm mt-[2px]">timer</div>
        </div>
        <div className="absolute -top-5 -right-5 flex">
          <div className="text-sm mt-[2px]">score</div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-blue-2 bg-orange-9">
            {!!context.result?.scoreDelta ? (
              <div className="animate-pop text-lg text-orange-12 font-bold duration-500">
                {`${context.result.scoreDelta > 0 ? "+" : ""}${context.result.scoreDelta
                  }`}
              </div>
            ) : (
              <div className="text-lg text-orange-12">
                {context.game?.score}
              </div>
            )}
          </div>
        </div>
        {(context.game?.streak ?? 0) > 1 && (
          <div className="absolute -bottom-5 -right-5 flex items-end ">
            <div className="text-sm mt-[2px]">streak</div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-blue-2 bg-orange-9 animate-pop duration-500">
              <div className="text-lg text-blue-12">{context.game?.streak}</div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-[30px] w-full items-center space-y-5 md:mt-0">
        {context.round!.choices.map((c) => {
          const chosen =
            current.matches({ Active: "Showing Answer" }) &&
            c.id === context.choice
          const state = current.matches({ Active: "Guessing" })
            ? undefined
            : context.result?.answer === c.id
              ? "success"
              : "error"

          return (
            <Button
              full
              disabled={
                current.matches({ Active: "Checking Answer" }) ||
                current.matches({ Active: "Showing Answer" })
              }
              key={c.name}
              className={cn({
                "uppercase tracking-tight text-xl": true,
              })}
              state={state}
              chosen={chosen}
              onClick={() => handleAnswer(c.id)}
            >
              {c.name}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

interface TimerProps {
  state: State<
    Context,
    GameEvent,
    never,
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
    return () => cancelAnimationFrame(requestRef.current as number)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.value, context.game?.expires])

  return <div className="text-lg text-orange-12">{seconds}</div>
}
