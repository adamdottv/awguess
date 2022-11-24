import type { NextPage } from "next"
import React from "react"
import { Layout } from "../components/layout"
import { Leaderboard } from "../components/leaderboard"
import Nav from "../components/nav"
import { trpc } from "../utils/trpc"

const LeaderboardPage: NextPage = () => {
  const leaderboardQuery = trpc.useQuery(["game.leaderboard"], {})

  return (
    <Layout>
      <Nav />
      <main className="container mx-auto max-w-sm md:max-w-3xl p-8 text-orange-9">
        <div className="text-center">
          {leaderboardQuery.data && (
            <Leaderboard data={leaderboardQuery.data} />
          )}
        </div>
      </main>
    </Layout>
  )
}

export default LeaderboardPage
