import type { NextPage } from "next"
import Head from "next/head"
import { inferMutationOutput, trpc } from "../utils/trpc"
import cn from "classnames"
import React from "react"

type Round = inferMutationOutput<"game.start">
type Result = inferMutationOutput<"game.answer">

const Home: NextPage = () => {
  const newGameMutation = trpc.useMutation(["game.new"])
  const startGameMutation = trpc.useMutation(["game.start"])
  const answerMutation = trpc.useMutation(["game.answer"])

  const [currentRound, setCurrentRound] = React.useState<Round>()
  const [choice, setChoice] = React.useState<string | undefined>()
  const [result, setResult] = React.useState<Result | undefined>()

  async function handleNewGame() {
    const response = await newGameMutation.mutateAsync({ name: "test" })
    const round = await startGameMutation.mutateAsync({ gameId: response.id })
    setCurrentRound(round)
  }

  async function handleAnswer(choice: string) {
    if (!currentRound) return
    if (answerMutation.isLoading) return

    const response = await answerMutation.mutateAsync({
      roundId: currentRound.id,
      choice,
    })

    setResult(response)
    setChoice(choice)

    setTimeout(() => {
      setResult(undefined)
      setChoice(undefined)
      setCurrentRound(response.next)
    }, 2000)
  }

  return (
    <>
      <Head>
        <title>awguess | Everyone&apos;s favorite AWS guessing game</title>
        <meta name="description" content="TBD" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto flex min-h-screen flex-col items-center justify-center p-8">
        {!currentRound && <Button onClick={handleNewGame}>New Game</Button>}
        {currentRound && (
          <Round
            round={currentRound}
            disabled={answerMutation.isLoading || result !== undefined}
            onAnswer={handleAnswer}
            choice={choice}
            result={result}
          />
        )}
      </main>
    </>
  )
}

export default Home

type RoundProps = {
  round: Round
  onAnswer: (choice: string) => void
  disabled: boolean
  choice: string | undefined
  result: Result | undefined
}

const Round: React.FC<RoundProps> = ({
  round,
  onAnswer,
  disabled,
  choice,
  result,
}) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={round.answer.image}
          alt="resource-logo"
          className="aspect-square w-96"
        />
      </div>
      <div className="relative mt-[40px] h-2 w-full">
        <div className="absolute inset-0 bg-gray-9" />
        <div className="absolute inset-0 w-20 bg-green-9" />
      </div>
      <div className="mt-[60px] w-full items-center space-y-6 md:flex md:space-y-0 md:space-x-6">
        {round.choices.map((c) => {
          const chosen = !!choice && c.name === choice
          const state =
            result === undefined
              ? undefined
              : result?.answer === c.name
              ? "success"
              : "error"

          return (
            <Button
              disabled={disabled}
              key={c.name}
              className={cn({
                "relative w-full md:w-64": true,
              })}
              state={state}
              chosen={chosen}
              onClick={() => onAnswer(c.name)}
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
  )
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
  ...props
}) => {
  return (
    <button
      className={cn({
        "relative border-2 bg-blue-3 py-5 px-12 text-xl font-bold": true,
        "border-orange-9 text-orange-9 after:bg-orange-9 hover:border-orange-11 hover:text-orange-11 hover:after:bg-orange-11":
          state === undefined || (state === "error" && !chosen),
        "after:absolute after:top-2 after:left-2 after:-right-2 after:-bottom-2 after:-z-10 after:content-['']":
          true,
        "focus:border-orange-11 focus:outline-none": true,
        "cursor-not-allowed": true,
        "pointer-events-none border-green-9 text-green-9 after:bg-green-9 hover:border-green-9 hover:text-green-9 hover:after:bg-green-9":
          state === "success",
        "pointer-events-none border-red-9 text-red-9 after:bg-red-9 hover:border-red-9 hover:text-red-9 hover:after:bg-red-9":
          state === "error" && chosen,
        [className ?? ""]: !!className,
      })}
      {...props}
    >
      {children}
    </button>
  )
}
