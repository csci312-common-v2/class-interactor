import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { v4 as uuidv4 } from "uuid";
import {
  onError,
  authenticated,
  AuthenticatedNextApiRequest,
} from "@/server/middleware";
import Room from "@/models/Room";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.post(authenticated, async (req, res) => {
  // Only send back basic Room data
  const { id, users, visibleId, ...other } = await Room.query().insertGraph(
    {
      ...req.body,
      visibleId: uuidv4(),
      users: [
        {
          id: (req as AuthenticatedNextApiRequest).user.id,
          role: "administrator",
        },
      ],
    },
    {
      // This tells `insertGraph` to not insert new languages.
      relate: true,
    },
  );
  res.status(200).json({ id: visibleId, ...other });
});

// The onError middleware will be invoked if the handler code throws an exception.
export default router.handler({ onError });
