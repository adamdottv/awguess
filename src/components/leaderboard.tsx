import cn from "classnames"
import Image from "next/image"
/* import Link from "next/link" */
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
      <div className="flex h-5 items-center font-semibold">
        <div className="whitespace-nowrap text-sm w-12">Rank</div>
        <div className="whitespace-nowrap text-sm flex-grow text-left ml-5">
          Player
        </div>
        <div className="whitespace-nowrap text-sm w-20">Score</div>
      </div>
      {data.map((score) => (
        <div
          key={score.rank}
          className={cn({
            "h-10 rounded-xl flex items-center": true,
            "bg-blue-6 outline outline-blue-9":
              userId && score.userId === userId,
            "bg-blue-3": !userId || score.userId !== userId,
          })}
        >
          <div className="whitespace-nowrap text-sm w-12 flex-shrink-0">
            {score.rank}
          </div>
          <div className="whitespace-nowrap text-sm flex-grow ml-5 truncate">
            <div className="flex space-x-2 items-center">
              {score.name && score.image ? (
                <Image
                  src={score.image}
                  alt={score.name}
                  className="rounded-full"
                  width={25}
                  height={25}
                />
              ) : (
                <div className="w-[25px] h-[25px] bg-blue-8 rounded-full text-blue-11 font-bold flex items-center justify-center">
                  ?
                </div>
              )}
              <div className="truncate">{score.name ?? "Anonymous"}</div>
            </div>
          </div>
          <div className="whitespace-nowrap text-sm w-20 text-center flex-shrink-0">
            {/* <Link href={{ pathname: "/game/[id]", query: { id: score.id } }}> */}
            {score.score}
            {/* </Link> */}
          </div>
        </div>
      ))}
    </div>
  )
}
