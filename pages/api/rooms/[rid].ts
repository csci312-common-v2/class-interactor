import type { NextApiRequest, NextApiResponse } from "next";
import { knex } from "../../../knex/knex";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { query, method } = req;
  switch (method) {
    case "GET":
      const room = await knex("Room").where({ id: query.rid }).select().first();
      res.status(200).json(room);
      break;
    default:
      res.setHeader("Allow", ["GET"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
