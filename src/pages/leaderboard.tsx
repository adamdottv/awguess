import type { NextPage } from "next"
import React from "react"
import { Layout } from "../components/layout"
import { Leaderboard } from "../components/leaderboard"
import { trpc } from "../utils/trpc"

const LeaderboardPage: NextPage = () => {
  const leaderboardQuery = trpc.useQuery(["game.leaderboard"], {})

  return (
    <Layout>
      <div className="text-center">
        {leaderboardQuery.data && <Leaderboard data={leaderboardQuery.data} />}
      </div>
    </Layout>
  )
}

export default LeaderboardPage
