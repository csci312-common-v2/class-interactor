import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
    } & DefaultSession["user"];
  }
  interface Account {}
  interface Profile {}
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
  }
}
