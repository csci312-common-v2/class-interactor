import type { NextApiRequest, NextApiResponse } from "next";
import type { NextHandler } from "next-connect";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import User from "../models/User";

// TODO: Improve error handler

export function onError(
  error: unknown,
  request: NextApiRequest,
  response: NextApiResponse,
) {
  response.status(500).end((error as Error).message);
}

export async function authenticated(
  request: NextApiRequest,
  response: NextApiResponse,
  next: NextHandler,
) {
  const session = await getServerSession(request, response, authOptions);
  if (session) {
    request.user = await User.query()
      .findById(session.user.id)
      .throwIfNotFound();
    await next(); // Authenticated, proceed to the next handler
  } else {
    response.status(403).end("You must be signed in to access this endpoint.");
  }
}
