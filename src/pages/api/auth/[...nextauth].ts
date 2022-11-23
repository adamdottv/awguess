import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
/* import DiscordProvider from "next-auth/providers/discord" */
import TwitterProvider from "next-auth/providers/twitter"
import cuid from "cuid"

// Prisma adapter for NextAuth, optional and can be removed
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "../../../server/db/client"
import { env } from "../../../env/server.mjs"

export const authOptions: NextAuthOptions = {
  debug: true,
  session: { strategy: "jwt" },
  callbacks: {
    /* signIn({ user, account, profile, email, credentials }) { */
    /*   console.log(user) */
    /*   console.log(account) */
    /*   console.log(profile) */
    /*   return true */
    /* }, */
    // Include user.id on session
    session({ session, user, token }) {
      /* console.log(session) */
      /* console.log(user) */
      /* console.log(token) */
      /**/
      if (session.user) {
        session.user.id = user?.id ?? token?.sub
      }
      return session
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: "anon",
      name: "Anonymous",
      credentials: {},
      async authorize() {
        const id = cuid()
        console.log(id)
        return { id, name: "Anonymous" }
      },
    }),
    /* DiscordProvider({ */
    /*   clientId: env.DISCORD_CLIENT_ID, */
    /*   clientSecret: env.DISCORD_CLIENT_SECRET, */
    /* }), */
    TwitterProvider({
      clientId: env.TWITTER_CLIENT_ID,
      clientSecret: env.TWITTER_CLIENT_SECRET,
    }),
  ],
}

export default NextAuth(authOptions)
