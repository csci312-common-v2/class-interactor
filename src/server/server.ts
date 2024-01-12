import express, { Express, Request, Response } from "express";
import * as http from "http";
import next, { NextApiHandler } from "next";
import * as socketio from "socket.io";

import { getNamespace, bindListeners } from "./socket";

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

  const io: socketio.Server = new socketio.Server();
  io.attach(server);

  // This parsing is required for next-auth-related requests to work
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
