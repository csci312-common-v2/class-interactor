import express, { Express, Request, Response } from "express";
import * as http from "http";
import next, { NextApiHandler } from "next";
import * as socketio from "socket.io";
import { knex } from "@/knex/knex";
import { v4 as uuidv4 } from "uuid";

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

// Develop from route description using /rooms/:rid/:admin?
// http://forbeslindesay.github.io/express-route-tester/
const roomRegEx = /^\/rooms\/(?:([^\/]+?))(?:\/([^\/]+?))?\/?$/i;

nextApp.prepare().then(() => {
  const app: Express = express();
  const server: http.Server = http.createServer(app);

  const io: socketio.Server = new socketio.Server();
  io.attach(server);

  app.use(express.json());
  app.use(function (req, res, next) {
    req.io = io;
    next();
  });

  // Dynamic route handler
  const rooms = io.of(async (name, auth, next) => {
    // Develop from route description using /rooms/:rid/:admin?
    // http://forbeslindesay.github.io/express-route-tester/
    const res = roomRegEx.exec(name);
    if (!res) {
      // Invalid room name, so reject the connection
      next(null, false);
      return;
    }

    const room = await knex("Room")
      .where({ visibleId: res[1] })
      .select()
      .first();
    if (!room) {
      // Unknown or invalid roomId
      next(null, false);
      return;
    }

    //TODO: Check if user is allowed to connect to the admin channel

    next(null, true);
  });

  rooms.on("connection", async (socket: socketio.Socket) => {
    console.log(`Connected to ${socket.nsp.name}`);

    const roomParams = roomRegEx.exec(socket.nsp.name);
    if (!roomParams) {
      socket.emit("RoomError");
      return;
    }
    const [, roomName, admin] = roomParams;
    const { id: roomId, ...room } = await knex("Room")
      .where({ visibleId: roomName })
      .select()
      .first();

    // When client newly connects send any pending state as socket commands
    // Pending polls
    knex
      .table("Poll")
      .where({ roomId })
      .orderBy("created_at", "desc")
      .then((polls) => {
        if (polls.length && !polls[0].ended_at) {
          socket.emit("PollStart", { id: polls[0].id });
        }
      });

    if (admin) {
      // Administration interface
      socket.on("PollLaunch", async (data, callback) => {
        // Create a new poll in the database with default options and zero counts. The `['id']` returns
        // the corresponding inserted values.
        const [poll] = await knex
          .table("Poll")
          .insert({ roomId, values: { A: 0, B: 0, C: 0, D: 0, E: 0 } }, ["id"]);

        // Launch poll on all viewers
        io.of(`/rooms/${roomName}`).emit("PollStart", poll);

        callback(poll);
      });

      socket.on("PollReveal", async ({ pollId }) => {
        const poll = await knex("Poll").first("values").where({ id: pollId });
        // Send poll results to all viewers
        io.of(`/rooms/${roomName}`).emit("PollResults", poll.values);
      });

      socket.on("PollToggle", async ({ pollId }) => {
        // Toggle poll visibility on all viewers
        io.of(`/rooms/${roomName}`).emit("PollToggle");
      });

      socket.on("PollEnd", async ({ pollId }, callback) => {
        // Set end time so we know poll is no longer active
        await knex("Poll")
          .where({ id: pollId })
          .update({ ended_at: knex.fn.now() });
        // End poll on all viewers
        io.of(`/rooms/${roomName}`).emit("PollEnd");
        callback(true);
      });
    } else {
      // Viewer interface
      socket.on("PollResponse", async (data, callback) => {
        const { id: pollId, prevChoice, newChoice } = data;

        // Fetch the current counts for this poll, update counts, subtracting if there is a previous value.
        // Perform the operations as a transaction so the update is atomic
        try {
          await knex.transaction(async (trx) => {
            // Fetch and update counts (stored as a JSON column)
            const poll = await trx("Poll")
              .first("values")
              .where({ id: pollId });

            if (prevChoice) {
              poll.values[prevChoice as string] += -1;
            }
            poll.values[newChoice as string] += 1;

            // Update counts as part of the transaction
            await trx("Poll")
              .where({ id: pollId })
              .update({ values: poll.values });

            // Update admin viewers with current results of the poll
            io.of(`/rooms/${roomName}/admin`).emit("PollResults", poll.values);

            // Let submitter know response received successfully
            callback({ choice: newChoice });
          });
        } catch (error) {
          callback(error);
        }
      });

      // Reaction
      socket.on("ReactionSend", async (codePoint) => {
        // TODO: Check if Emoji is in the allowed list
        if (codePoint) {
          io.of(`/rooms/${roomName}`).emit("ReactionShow", {
            id: uuidv4(),
            position: Math.floor(Math.random() * 100),
            codePoint,
          });
        }
      });
    }

    socket.on("disconnect", () => {
      console.log("client disconnected");
    });
  });

  // Pass any un-handled requests through to Next
  app.all("*", (req: any, res: any) => nextHandler(req, res));

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});