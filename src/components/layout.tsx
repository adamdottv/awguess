import Head from "next/head"
import { ComponentProps } from "react"
import Nav from "./nav"

const title = "awguess"
const description = "Everyone's favorite AWS guessing game"

export const Layout: React.FC<ComponentProps<"div">> = ({ children }) => {
  return (
    <>
      <Head>
        <title>{`${title} | ${description}`}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:site_name" content="awguess" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:url" content="https://awguess.com" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="og:image" content="https://awguess.com/banner.png" />
        <meta name="twitter:site" content="@adamdotdev" />
      </Head>

      {children}
    </>
  )
}
