import * as socketio from "socket.io";
import { knex } from "../knex/knex";
import { v4 as uuidv4 } from "uuid";

// Develop from route description using /rooms/:rid/:admin?
// http://forbeslindesay.github.io/express-route-tester/
const roomRegEx = /^\/rooms\/(?:([^\/]+?))(?:\/([^\/]+?))?\/?$/i;

export function getNamespace(io: socketio.Server) {
  return io.of(async (name, auth, next) => {
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

    next(null, true);
  });
}

export function bindListeners(io: socketio.Server, room: socketio.Namespace) {
  // TODO: Add authentication middleware

  room.on("connection", async (socket: socketio.Socket) => {
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

    // Asynchronous queries launched on connection
    const connectionQueries = [];

    // Send any pending polls when a client newly connects
    connectionQueries.push(
      knex
        .table("Poll")
        .where({ roomId })
        .orderBy("created_at", "desc")
        .then((polls) => {
          if (polls.length && !polls[0].ended_at) {
            socket.emit("PollStart", { id: polls[0].id });
          }
        })
    );

    if (admin) {
      // Administration interface

      // Send all questions when a client newly connects
      connectionQueries.push(
        knex
          .table("Question")
          .where({ roomId })
          .then((questions) => {
            socket.emit(
              "QuestionNew",
              questions.map(({ roomId: dropRoomId, ...question }) => question)
            );
          })
      );

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

      // Question Board
      socket.on("QuestionApprove", async ({ questionId }, callback) => {
        // Approve question
        const [{ roomId: dropRoomId, ...question }] = await knex("Question")
          .where({ id: questionId })
          .update({ approved: true }, ["*"]);
        // Send question to all viewers
        io.of(`/rooms/${roomName}`).emit("QuestionNew", [question]);
        callback(question);
      });

      socket.on("QuestionClear", async ({}) => {
        // Delete all questions
        await knex("Question").where({ roomId }).delete();

        io.of(`/rooms/${roomName}`).emit("QuestionClear");
        socket.emit("QuestionClear");
      });
    } else {
      // Viewer interface

      // Send all approved questions when a client newly connects
      connectionQueries.push(
        knex
          .table("Question")
          .where({ roomId, approved: true })
          .then((questions) => {
            socket.emit(
              "QuestionNew",
              questions.map(({ roomId: dropRoomId, ...question }) => question)
            );
          })
      );

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

    // Question Board
    socket.on("QuestionAsk", async (data, callback) => {
      const [{ roomId: dropRoomId, ...newQuestion }] = await knex
        .table("Question")
        .insert({ roomId, ...data, approved: false, votes: 0 }, ["*"]);
      callback(true);

      // Send question to administrator for approval
      io.of(`/rooms/${roomName}/admin`).emit("QuestionNew", [newQuestion]);
    });

    socket.on("QuestionUpvote", async ({ questionId }, callback) => {
      const [{ roomId: dropRoomId, ...question }] = await knex
        .table("Question")
        .where({ id: questionId })
        .update({ votes: knex.raw("votes + 1") }, ["*"]);

      // Send updated question to viewers and administrator
      io.of(`/rooms/${roomName}`).emit("QuestionNew", [question]);
      io.of(`/rooms/${roomName}/admin`).emit("QuestionNew", [question]);
    });

    Promise.all(connectionQueries).then(() => {
      // Send event when all room initialization queries are complete
      socket.emit("RoomJoined", room);
    });
  });
}
