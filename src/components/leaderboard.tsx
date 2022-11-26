import cn from "classnames"
import Image from "next/image"
import { ComponentProps } from "react"
import { inferQueryOutput } from "../utils/trpc"

type LeaderboardData = inferQueryOutput<"game.leaderboard">

export interface LeaderboardProps extends ComponentProps<"div"> {
  data: LeaderboardData
  userId?: string
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ data, userId }) => {
  return (
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
          {data.map((score) => (
            <tr
              key={score.rank}
              className={cn({
                "h-10": true,
                "bg-blue-6 outline outline-blue-9":
                  userId && score.userId === userId,
                "bg-blue-3": !userId || score.userId !== userId,
              })}
            >
              <td>{score.rank}</td>
              <td>
                <div className="flex space-x-2 items-center justify-center">
                  {score.name && score.image && (
                    <Image
                      src={score.image}
                      alt={score.name}
                      className="rounded-full"
                      width={25}
                      height={25}
                    />
                  )}
                  <div>{score.name ?? "Anonymous"}</div>
                </div>
              </td>
              <td>{score.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
