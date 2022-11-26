import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import LinkedinProvider from "next-auth/providers/linkedin"
import TwitterProvider from "next-auth/providers/twitter"
import cuid from "cuid"

// Prisma adapter for NextAuth, optional and can be removed
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "../../../server/db/client"
import { env } from "../../../env/server.mjs"
import { NextApiRequest, NextApiResponse } from "next"
import { getToken } from "next-auth/jwt"
import { claimGames } from "../../../server/common/user"

const secret = env.NEXTAUTH_SECRET

export const authOptions: NextAuthOptions = {
  /* debug: true, */
  session: { strategy: "jwt" },
  adapter: PrismaAdapter(prisma),
  callbacks: {
    // Include user.id on session
    session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id ?? token?.sub
      }
      return session
    },
  },
  providers: [
    CredentialsProvider({
      id: "anon",
      name: "Anonymous",
      credentials: {},
      async authorize() {
        const id = cuid()
        return { id }
      },
    }),
    LinkedinProvider({
      clientId: env.LINKEDIN_CLIENT_ID,
      clientSecret: env.LINKEDIN_CLIENT_SECRET,
    }),
    TwitterProvider({
      clientId: env.TWITTER_CLIENT_ID,
      clientSecret: env.TWITTER_CLIENT_SECRET,
    }),
  ],
}

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  let existingToken = undefined
  try {
    existingToken = await getToken({ req, secret })
  } catch (error) {
    console.error(error)
  }

  const anonymousUserId =
    existingToken && !existingToken.email && existingToken.sub

  return await NextAuth(req, res, {
    ...authOptions,
    callbacks: {
      ...authOptions.callbacks,
      async jwt({ token, user }) {
        // If a user signs in with oauth,
        // claim all prior games under previous
        // (anonymous) ID.
        if (anonymousUserId && user?.email) {
          await claimGames(anonymousUserId, user.id)
        }

        return token
      },
    },
  })
}
