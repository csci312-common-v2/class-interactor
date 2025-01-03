import * as socketio from "socket.io";
import { getToken } from "next-auth/jwt";
import { v4 as uuidv4 } from "uuid";
import { parse, serialize } from "cookie";
// Due to the way Next creates a production application, we need to import knex
// via a relative path, not using "@"
import { knex } from "../knex/knex";
import Room from "../models/Room";
import GraspReaction from "../models/GraspReaction";

// Develop from route description using /rooms/:rid/:admin?
// http://forbeslindesay.github.io/express-route-tester/
const roomRegEx = /^\/rooms\/(?:([^\/]+?))(?:\/([^\/]+?))?\/?$/i;

interface GraspReactionWithCount extends GraspReaction {
  count: number;
}

async function getActiveGraspReactionCount(
  roomId: number,
  timeInMinutes: number = 5,
) {
  const currentDate = new Date(Date.now()); // Use Date.now() for testing

  // Grab the latest active reaction from a specific user in a room
  const latestActiveReactions = await knex("GraspReaction")
    .distinctOn("anon_user_id")
    .select("*")
    .where("is_active", true)
    .andWhere("room_id", roomId)
    .orderBy("anon_user_id", "asc")
    .orderBy("sent_at", "desc");

  // Create an array to store the counts for each level in the order that they will be graphed
  // Note that all levels are returned to ensure GraspGaugeGraph order and colors
  const levelCounts: { level: string; count: number }[] = [
    { level: "good", count: 0 },
    { level: "unsure", count: 0 },
    { level: "lost", count: 0 },
  ];

  // Calculate the linear decay for each reaction in latestActiveReactions
  latestActiveReactions.forEach((reaction) => {
    const timeDifferenceInSeconds =
      (currentDate.getTime() - new Date(reaction.sent_at).getTime()) / 1000;
    const decay = Math.max(
      0,
      1 - timeDifferenceInSeconds / (timeInMinutes * 60),
    );

    // Find the corresponding level in levelCounts and add the decay
    const levelCount = levelCounts.find((lc) => lc.level === reaction.level);
    if (levelCount) {
      levelCount.count += decay;
    }
  });

  return levelCounts;
}

export function getNamespace(io: socketio.Server) {
  return io.of(async (name, auth, next) => {
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
  room.use(async (socket, next) => {
    const roomParams = roomRegEx.exec(socket.nsp.name);
    if (!roomParams) {
      next(new Error("Invalid room name"));
    } else if (roomParams[2] === "admin") {
      // Attempting an administrative connection

      // Then next-auth cookies (containing the token should be passed with handshake request). Parse
      // the cookies and extract (and verify) the token and user id encoded within.
      const cookies = socket.request.headers.cookie
        ? parse(socket.request.headers.cookie)
        : {};
      const token = await getToken({
        req: Object.assign(socket.request, { cookies }),
      });
      if (!token) {
        next(new Error("Unable to authenticate user"));
        return;
      }

      // Is this user an administrator of the room?
      const [administeredRoom] = await Room.query()
        .where({ visibleId: roomParams[1] })
        .withGraphFetched("users(filterIdAndRole)")
        .modifiers({
          filterIdAndRole(builder) {
            builder.where({ id: token.id, role: "administrator" });
          },
        });

      if (administeredRoom.users.length === 0) {
        next(new Error("User is not an administrator of this room"));
        return;
      }

      next();
    } else {
      // Allow all non-administrative connections
      next();
    }
  });

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
        }),
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
              questions.map(({ roomId: dropRoomId, ...question }) => question),
            );
          }),
      );

      // Question Poll
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

      socket.on("QuestionRemove", async ({ questionId }, callback) => {
        // Remove question
        const [question] = await knex("Question").where({ id: questionId });

        if (question) {
          await knex("Question").where({ id: question.id }).delete();
          // Remove question from all viewers
          // Participants
          io.of(`/rooms/${roomName}`).emit("QuestionRemoved", question.id);
          // Admin
          socket.emit("QuestionRemoved", question.id);

          if (typeof callback === "function") {
            callback(question.id);
          }
        }
      });

      socket.on("QuestionClear", async ({}) => {
        // Delete all questions
        await knex("Question").where({ roomId }).delete();

        io.of(`/rooms/${roomName}`).emit("QuestionClear");
        socket.emit("QuestionClear");
      });

      // Grasp Reactions
      // Send all active reactions when a client newly connects
      connectionQueries.push(
        socket.emit(
          "GraspReactionGet",
          await getActiveGraspReactionCount(roomId),
        ),
      );

      socket.on("GraspReactionReset", async (data, callback) => {
        // Set all reactions to inactive
        await GraspReaction.query()
          .where("room_id", roomId)
          .patch({ is_active: false });
        socket.emit("GraspReactionReset");

        // Primarily for testing
        if (typeof callback === "function") {
          callback(true);
        }
      });

      socket.on("GraspReactionToggle", async (data) => {
        // Toggle
        io.of(`/rooms/${roomName}`).emit("GraspReactionToggle");
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
              questions.map(({ roomId: dropRoomId, ...question }) => question),
            );
          }),
      );

      socket.on("PollResponse", async (data, callback) => {
        const { id: pollId, prevChoice, newChoice } = data;

        // Update the poll values as an atomic transaction
        try {
          const poll = await knex.transaction(async (trx) => {
            if (prevChoice) {
              // Use Postgres JSON operations to update poll values in one query. The '||' combines json objects. :prevChoice::text is required
              // to cast the parameter to a string for use as a key.
              await trx("Poll")
                .where({ id: pollId })
                .update({
                  values: knex.raw(
                    `values || jsonb_build_object(:prevChoice::text, GREATEST((values->>:prevChoice)::int - 1, 0), :newChoice::text, (values->>:newChoice)::int + 1)`,
                    { prevChoice, newChoice },
                  ),
                });
            } else {
              await trx("Poll")
                .where({ id: pollId })
                .update({
                  values: knex.raw(
                    `values || jsonb_build_object(:newChoice::text, (values->>:newChoice)::int + 1)`,
                    { newChoice },
                  ),
                });
            }

            // Fetch the updated values to send to any admin viewers
            return trx("Poll").first("values").where({ id: pollId });
          });

          // Update admin viewers with current results of the poll
          io.of(`/rooms/${roomName}/admin`).emit("PollResults", poll.values);

          // Let the submitter know their response was received successfully
          callback({ choice: newChoice });
        } catch (error) {
          console.log("Error", error);
          if (error instanceof Error) {
            console.log("Error", error.message);
          }
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

      // Grasp Reaction
      socket.on("GraspReactionSend", async (data, callback) => {
        const anonUserId = socket.request.anonUserCookie;

        // Add grasp reaction to table with associated user
        const [{ room_id: dropRoomId, ...newReaction }] = await knex
          .table("GraspReaction")
          .insert({ room_id: roomId, anon_user_id: anonUserId, ...data }, [
            "*",
          ]);

        // Send this event over to the admin
        io.of(`/rooms/${roomName}/admin`).emit(
          "GraspReactionGet",
          await getActiveGraspReactionCount(roomId),
        );

        if (typeof callback === "function") {
          callback(true);
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

    // Grasp Reaction
    socket.on("GraspReactionGet", async (data, callback) => {
      // Send updated count calculations to admin
      socket.emit(
        "GraspReactionGet",
        await getActiveGraspReactionCount(roomId),
      );

      // Primarily for testing
      if (typeof callback === "function") {
        callback(true);
      }
    });

    Promise.all(connectionQueries).then(() => {
      // Send event when all room initialization queries are complete
      socket.emit("RoomJoined", room);
    });
  });
}
