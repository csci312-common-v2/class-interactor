import * as http from "http";
import { parse as parseUrl } from "url";
import { parse as parseCookie, serialize } from "cookie";
import next from "next";
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
const nextHandler = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const server: http.Server = http.createServer((req, res) => {
    const parsedUrl = parseUrl(req.url!, true);
    nextHandler(req, res, parsedUrl);
  });

  const io: socketio.Server = new socketio.Server(server, {
    allowRequest: async (req, callback) => {
      const cookies = parseCookie(req.headers.cookie || "");
      let anonUserId;

      if (!cookies["anon-user"]) {
        // Cookie is not present, create the cookie value
        // (i.e. new AnonUser and store it in database)
        const [anonUserObject] = await knex
          .table("AnonUser")
          .insert({})
          .returning("id");
        anonUserId = anonUserObject.id;
      } else {
        anonUserId = cookies["anon-user"];
      }

      // Attach anonymous id to request object
      req.anonUserCookie = anonUserId;
      callback(null, true);
    },
  });

  io.engine.on("initial_headers", (headers, request) => {
    // Set the anon-user cookie
    const cookieValue = request.anonUserCookie;
    const duration = 15 * 7 * 24 * 60 * 60; // 15 weeks

    // Always reset the duration
    headers["set-cookie"] = serialize("anon-user", cookieValue, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: duration,
    });
  });

  // These parsers is required for Next and next-auth-related requests to work
  //app.use(express.json());
  //app.use(express.urlencoded({ extended: true }));

  // Bind socket listeners to dynamic namespaces
  const room = getNamespace(io);
  bindListeners(io, room);

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
