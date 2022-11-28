import type { GetStaticProps, InferGetStaticPropsType } from "next"
import React from "react"
import { getLeaderboard, LeaderboardData } from "../../lib/leaderboard"
import { Layout } from "../components/layout"
import { Leaderboard } from "../components/leaderboard"
import Nav from "../components/nav"

function LeaderboardPage({
  leaderboard,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <Layout>
      <Nav />
      <main className="container mx-auto max-w-sm md:max-w-3xl p-8 text-orange-9">
        <div className="text-center">
          {leaderboard && <Leaderboard data={leaderboard} />}
        </div>
      </main>
    </Layout>
  )
}

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// revalidation is enabled and a new request comes in
export const getStaticProps: GetStaticProps<{
  leaderboard: LeaderboardData
}> = async () => {
  const leaderboard = await getLeaderboard(0, 30)
  if (!leaderboard) return { notFound: true }

  return {
    props: { leaderboard },
    revalidate: 2, // In seconds
  }
}

export default LeaderboardPage
