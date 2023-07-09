import type { NextApiRequest, NextApiResponse } from "next";
import { knex } from "@/knex/knex";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { query, method } = req;
  switch (method) {
    case "GET":
      const { id, visibleId, ...other } = await knex("Room")
        .where({ visibleId: query.rid })
        .select()
        .first();
      res.status(200).json({ id: visibleId, ...other });
      break;
    default:
      res.setHeader("Allow", ["GET"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
