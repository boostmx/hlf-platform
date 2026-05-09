import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { authPrisma, sharedCookieConfig } from "@hlf/auth-db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await authPrisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          bio: user.bio ?? undefined,
          avatarUrl: user.avatarUrl ?? undefined,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 30,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.username = user.username as string;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.email = user.email;
        token.avatarUrl = user.avatarUrl;
        token.bio = user.bio;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.sub) {
        session.user = {
          id: token.sub,
          username: token.username as string,
          firstName: token.firstName as string,
          lastName: token.lastName as string,
          email: token.email as string,
          bio: token.bio as string,
          avatarUrl: token.avatarUrl as string,
          isAdmin: token.isAdmin as boolean,
        };
      }
      return session;
    },
  },

  pages: {
    signIn: "/sign-in",
  },

  cookies: sharedCookieConfig(),

  secret: process.env.NEXTAUTH_SECRET,
};

export async function auth() {
  return await getServerSession(authOptions);
}
