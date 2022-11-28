import { Prisma } from "@prisma/client"
import { GetStaticProps, InferGetStaticPropsType } from "next"
import { getGame } from "../../../lib/game"
import { Layout } from "../../components/layout"
import Nav from "../../components/nav"
import cn from "classnames"
/* import { CheckCircleIcon } from "@heroicons/react/24/solid" */
import resources from "../../../data/resources.json"

function GamePage({
  game,
  services,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const stats = [
    { name: "Score", stat: game.score },
    { name: "Rounds", stat: game.rounds.length },
    { name: "Streak", stat: game.longest },
  ]

  const rounds = game.rounds.filter((r) => r.choice)

  return (
    <Layout>
      <Nav />
      <main className="container mx-auto max-w-md md:max-w-3xl p-6 md:p-8 text-orange-9 space-y-8">
        <div>
          <h3 className="text-xl font-medium leading-6 text-blue-12">
            Details
          </h3>
          <dl className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            {stats.map((item) => (
              <div
                key={item.name}
                className="overflow-hidden rounded-lg bg-blue-5 px-4 py-5 sm:p-6"
              >
                <dt className="truncate text-sm font-medium text-blue-11">
                  {item.name}
                </dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-blue-12">
                  {item.stat}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flow-root">
          <h3 className="text-xl font-medium leading-6 text-blue-12">
            Timeline
          </h3>
          <ul role="list" className="mt-5 -mb-8 ml-1">
            {rounds.map((round, roundIndex) => {
              const previous = rounds[roundIndex - 1]
              const correct = services.find((s) => s.id === round.answer)
              const guessed = services.find((s) => s.id === round.choice)
              const isCorrect = correct?.id === guessed?.id
              const duration =
                (round.end?.getTime() ?? game.expires.getTime()) -
                (previous?.end?.getTime() ?? game.start.getTime())
              const seconds = duration / 1000

              const content = (
                <div className="relative flex space-x-5">
                  <div className="">
                    <img
                      src={correct?.image}
                      alt={correct?.name}
                      className={cn({
                        "h-24 w-24 md:h-32 md:w-32 rounded-2xl ring-8 ring-offset-4 ring-blue-2 border-4 border-blue-2":
                          true,
                        "ring-offset-green-9": isCorrect,
                        "ring-offset-red-9": !isCorrect,
                      })}
                    />
                    {/* <CheckCircleIcon className="h-5 w-5 absolute top-2 -left-8 text-green-11" /> */}
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4">
                    <div>
                      <p
                        className={cn({
                          "text-xl md:text-2xl text-gray-12": true,
                        })}
                      >
                        {!isCorrect && (
                          <span className="block text-red-9 line-through">
                            {guessed?.name}
                          </span>
                        )}
                        {correct?.name}
                      </p>
                      {correct?.summary && (
                        <p className="text-sm md:text-lg text-gray-11 max-w-md">
                          {correct?.summary}
                        </p>
                      )}
                    </div>
                    {/* <div className="whitespace-nowrap text-right text-sm text-gray-500"> */}
                    {/*   <time dateTime={round.start.toISOString()}> */}
                    {/*     {round.start.toISOString()} */}
                    {/*   </time> */}
                    {/* </div> */}
                  </div>
                </div>
              )

              return (
                <li key={round.id}>
                  <div className="relative">
                    <div
                      className="flex items-center"
                      style={{ height: seconds * 15 }}
                    >
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-10"
                        aria-hidden="true"
                      />
                      <div className="text-sm text-blue-11 ml-7">
                        <div>{seconds.toFixed(1)}s</div>
                      </div>
                    </div>
                    {correct?.url ? (
                      <a
                        href={correct.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </main>
    </Layout>
  )
}

type GameWithDetails = Prisma.GameGetPayload<{
  include: { user: true; rounds: true }
}>

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// revalidation is enabled and a new request comes in
export const getStaticProps: GetStaticProps<{
  game: GameWithDetails
  services: {
    id: string
    name: string
    image: string
    summary?: string
    url?: string
  }[]
}> = async ({ params }) => {
  const id = params?.id as string
  const game = await getGame(id)
  if (!game) return { notFound: true }

  const formatSummary = (summary: string | undefined) => {
    if (!summary) return undefined
    return summary.replaceAll("<p>", "").replaceAll("</p>", "").trim() + "."
  }

  const services = resources
    .filter((r) =>
      game.rounds.find(
        (round) => round.answer === r.id || round.choice === r.id
      )
    )
    .map((r) => ({
      id: r.id,
      name: r.name,
      image: r.image.original,
      url: r.url,
      summary: formatSummary(r.summary),
    }))

  return {
    props: { game, services },
    // Next.js will attempt to re-generate the page:
    // - When a request comes in
    // - At most once every 10 seconds
    /* revalidate: 10, // In seconds */
  }
}

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// the path has not been generated.
export async function getStaticPaths() {
  /* const res = await fetch('https://.../posts') */
  /* const posts = await res.json() */
  /**/
  /* // Get the paths we want to pre-render based on posts */
  /* const paths = posts.map((post) => ({ */
  /*   params: { id: post.id }, */
  /* })) */

  // We'll pre-render only these paths at build time.
  // { fallback: blocking } will server-render pages
  // on-demand if the path doesn't exist.
  return { paths: [], fallback: "blocking" }
}

export default GamePage
