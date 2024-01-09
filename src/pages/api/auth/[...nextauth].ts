import NextAuth, {
  type Account as AccountType,
  type Profile as ProfileType,
  type User as UserType,
  type Session as SessionType,
} from "next-auth";
import { type JWT as JWTType } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { PartialModelGraph } from "objection";
import Account from "@/models/Account";
import User from "@/models/User";

export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // ...add more providers here
  ],
  callbacks: {
    async signIn({
      account,
      profile,
    }: {
      account: AccountType | null;
      profile?: ProfileType;
    }): Promise<boolean> {
      if (account?.provider === "google") {
        const { email_verified, email } = profile as {
          email_verified: boolean;
          email: string;
        };
        return email_verified && email.endsWith("@middlebury.edu");
      }
      return false; // Do different verification for other providers that don't have `email_verified`
    },
    async jwt({
      token,
      account,
      user,
    }: {
      token: JWTType;
      account: AccountType | null;
      user?: UserType;
    }) {
      if (account && user) {
        let localAccount = await Account.query()
          .findOne({
            provider: account.provider,
            providerId: account.providerAccountId,
          })
          .withGraphFetched("user");

        if (!localAccount) {
          // Check for existing user account with the same e-mail
          const localUser = await User.query().findOne({ email: user.email });
          if (localUser) {
            // If found, link this account to the existing User with the same e-mail address. We assume that the oauth
            // email is verified (since we checked it in the signIn callback above).
            localAccount = (await User.relatedQuery("accounts")
              .insert({
                provider: account.provider,
                providerId: account.providerAccountId,
              })
              .returning("*")) as Account;
          } else {
            // Create new user record in the database
            localAccount = await Account.query()
              .insertGraph({
                provider: account.provider,
                providerId: account.providerAccountId,
                user: {
                  name: user.name,
                  email: user.email,
                },
              } as PartialModelGraph<Account>)
              .returning("*");
            // Using this approach for types: https://github.com/Vincit/objection.js/issues/2117#issuecomment-935515779
          }
        }
        // Add user id to the token
        token.id = localAccount.userId;
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: SessionType;
      token: JWTType;
    }) {
      // Add user id to the session
      session.user.id = token.id;
      return session;
    },
  },
};

export default NextAuth(authOptions);
