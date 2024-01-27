import express, { Express, Request, Response } from "express";
import * as http from "http";
import { parse, serialize } from "cookie";
import next, { NextApiHandler } from "next";
import * as socketio from "socket.io";

import { getNamespace, bindListeners } from "./socket";
import { knex } from "../knex/knex";

declare global {
  namespace Express {
    export interface Request {
      io?: socketio.Server;
    }
  }
}

// https://wallis.dev/blog/socketio-with-nextjs-and-es6-import

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";

const nextApp = next({ dev });
const nextHandler: NextApiHandler = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app: Express = express();
  const server: http.Server = http.createServer(app);

  const io: socketio.Server = new socketio.Server(server, {
    allowRequest: async (req, callback) => {
      const cookies = parse(req.headers.cookie || "");
      let anonGraspId;

      if (!cookies["anon-grasp-user"]) {
        // Cookie is not present, create the cookie value
        // (i.e. new AnonGraspUser and store it in database)
        const [anonGraspObject] = await knex
          .table("AnonGraspUser")
          .insert({})
          .returning("id");
        anonGraspId = anonGraspObject.id;
      } else {
        // Cookie is present, ensure it is already stored in the database
        const [anonGraspObject] = await knex
          .table("AnonGraspUser")
          .where("id", cookies["anon-grasp-user"]);
        anonGraspId = anonGraspObject.id;
      }

      // Attach anonymous id to request object
      req.anonGraspUserCookie = anonGraspId;
      callback(null, true);
    },
  });

  io.engine.on("initial_headers", (headers, request) => {
    // Set the anon-grasp-user cookie
    const cookieValue = request.anonGraspUserCookie;
    const duration = 15 * 7 * 24 * 60 * 60; // 15 weeks

    // Always reset the duration
    headers["set-cookie"] = serialize("anon-grasp-user", cookieValue, {
      sameSite: "strict",
      maxAge: duration,
    });
  });

  // These parsers is required for Next and next-auth-related requests to work
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Bind socket listeners to dynamic namespaces
  const room = getNamespace(io);
  bindListeners(io, room);

  // Pass any un-handled requests through to Next
  app.all("*", (req: any, res: any) => nextHandler(req, res));

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
