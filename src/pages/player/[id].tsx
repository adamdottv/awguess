import { Prisma } from "@prisma/client"
import { GetStaticProps, InferGetStaticPropsType } from "next"
import { getUser } from "../../../lib/user"
import { Layout } from "../../components/layout"
import Nav from "../../components/nav"
import cn from "classnames"
/* import { CheckCircleIcon } from "@heroicons/react/24/solid" */

function PlayerPage({ user }: InferGetStaticPropsType<typeof getStaticProps>) {
  /* const stats = [ */
  /*   { name: "Score", stat: game.score }, */
  /*   { name: "Rounds", stat: game.rounds.length }, */
  /*   { name: "Streak", stat: game.longest }, */
  /* ] */

  return (
    <Layout>
      <Nav />
      <main className="container mx-auto max-w-md md:max-w-3xl p-6 md:p-8 text-orange-9 space-y-8"></main>
    </Layout>
  )
}

type PlayerWithDetails = Prisma.UserGetPayload<{
  include: { games: true }
}>

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// revalidation is enabled and a new request comes in
export const getStaticProps: GetStaticProps<{
  user: PlayerWithDetails
}> = async ({ params }) => {
  const id = params?.id as string
  const user = await getUser(id)
  if (!user) return { notFound: true }

  return {
    props: { user },
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

export default PlayerPage
