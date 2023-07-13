/**
 * @jest-environment node
 *
 * These are exclusively server-side tests and so we use the Node environment
 * for server-side tests to avoid loading browser libraries
 */

import * as http from "http";
import { AddressInfo } from "net";
import { Server } from "socket.io";
import { default as Client, Socket as ClientSocket } from "socket.io-client";
import { knex } from "@/knex/knex";
import { getNamespace, bindListeners } from "./socket";

function allEvents(socket: ClientSocket, events: string[]) {
  // Return a promise that resolves when all events have been received
  return Promise.all(
    events.map(
      (event) =>
        new Promise((resolve) => {
          socket.on(event, resolve);
        })
    )
  );
}

describe("Server-side socket testing", () => {
  let server: http.Server;
  let socket_server: Server;
  let socket_client: ClientSocket;
  let socket_admin: ClientSocket;

  beforeAll(() => {
    // Create a socket server
    server = http.createServer().listen();
    socket_server = new Server();
    socket_server.attach(server);

    // Bind socket listeners to dynamic namespace (i.e., we create rooms dynamically)
    const room = getNamespace(socket_server);
    bindListeners(socket_server, room);

    // Ensure test database is initialized before an tests
    return knex.migrate.rollback().then(() => knex.migrate.latest());

    // We need to extend the timeout since we are starting containers with the database server
  }, 10000);

  afterAll(async () => {
    await new Promise((resolve) => {
      socket_server.close(resolve);
    });

    // To prevent a warning message from jest about a process failing to exit
    // gracefully, we explicitly destroy the knex connection pool. Note we will
    // get an abort error if any subsequent queries are attempted after this point.
    await knex.destroy();
  });

  beforeEach(() => {
    // Reset contents of the test database
    return knex.seed.run();
  });

  afterEach(() => {
    // Disconnect any connected sockets created during a test
    if (socket_client && socket_client.connected) {
      socket_client.disconnect();
    }

    if (socket_admin && socket_admin.connected) {
      socket_admin.disconnect();
    }
  });

  describe("Room creation", () => {
    test.each(["", "/admin"])("Connects to valid room (%s)", (admin) => {
      const { address, port } = server.address() as AddressInfo;
      socket_client = Client(
        `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1${admin}`,
        {
          autoConnect: false,
        }
      );

      // Register event handlers before we connect so no events are missed
      const events = allEvents(socket_client, ["connect", "RoomJoined"]).then(
        () => {
          // Make sure all expected events have been received
          expect(socket_client.connected).toBe(true);
        }
      );

      socket_client.connect();

      // Return promise waiting on all events to be received. Test will fail if
      // promise is rejected.
      return events;
    });

    test("Rejects an invalid room", () => {
      const { address, port } = server.address() as AddressInfo;
      socket_client = Client(`http://[${address}]:${port}/junk`, {
        autoConnect: false,
      });

      const events = allEvents(socket_client, ["connect_error"]).then(
        ([error]) => {
          expect(error).toBeInstanceOf(Error);
        }
      );

      socket_client.connect();

      return events;
    });
  });

  describe("Question submission", () => {
    let question: Question;
    beforeEach(async () => {
      // Add a pending question to the database
      const [{ id: roomId }] = await knex("Room")
        .select("id")
        .where("visibleId", "a418c099-4114-4c55-8a5b-4a142c2b26d1");
      question = await knex("Question").insert(
        {
          roomId,
          question: "Test question",
          anonymous: true,
        },
        ["*"]
      );
    });

    test.each([
      ["", 0],
      ["/admin", 1],
    ])(
      "Active questions are sent on connection to room (%s)",
      (admin, numQuestions) => {
        const { address, port } = server.address() as AddressInfo;
        socket_client = Client(
          `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1${admin}`,
          {
            autoConnect: false,
          }
        );

        // Participants only see approved questions, administrators see all
        const events = allEvents(socket_client, [
          "QuestionNew",
          "connect",
          "RoomJoined",
        ]).then(([questions]) => {
          expect(questions).toHaveLength(numQuestions);
          if (numQuestions > 0) {
            const [question, ...rest] = questions as Question[];
            expect(question).not.toHaveProperty("roomId"); // roomId is not sent to clients
          }
        });
        socket_client.connect();
        return events;
      }
    );

    test("Submitted questions must be approved by an admin", async () => {
      const { address, port } = server.address() as AddressInfo;
      socket_client = Client(
        `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1`,
        {
          autoConnect: false,
        }
      );

      socket_admin = Client(
        `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1/admin`,
        {
          autoConnect: false,
        }
      );

      const initialized = Promise.all([
        allEvents(socket_admin, ["QuestionNew", "connect", "RoomJoined"]),
        allEvents(socket_client, ["QuestionNew", "connect", "RoomJoined"]),
      ]);

      socket_client.connect();
      socket_admin.connect();

      // Wait for both clients to be fully initialized
      await initialized;

      // Specify expected shape of the question object using Jest matchers
      const question_matcher = {
        id: expect.any(Number),
        question: "A new question",
        anonymous: true,
        approved: false,
        votes: 0,
        created_at: expect.any(String),
      };

      // The admin channel should receive the question for approval
      const admin_events = new Promise<Question[]>((resolve) => {
        socket_admin.off("QuestionNew").on("QuestionNew", resolve);
      }).then((questions) => {
        expect(questions).toHaveLength(1);
        expect(questions[0]).toMatchObject(question_matcher);
        return questions[0].id;
      });

      // Send in a new question as a participant
      const participant_callbacks = new Promise((resolve) => {
        socket_client.emit(
          "QuestionAsk",
          { question: "A new question", anonymous: true },
          resolve
        );
      }).then((success) => {
        expect(success).toBe(true);
      });

      // Wait for the question to be asked and sent for approval
      const [questionId] = await Promise.all([
        admin_events,
        participant_callbacks,
      ]);

      // If the admin approves the question it should be sent to the participant(s)
      const participant_events = new Promise<Question[]>((resolve) => {
        socket_client.off("QuestionNew").on("QuestionNew", resolve);
      }).then((questions) => {
        expect(questions).toHaveLength(1);
        expect(questions[0]).toMatchObject({
          ...question_matcher,
          approved: true,
        });
      });

      const admin_callbacks = new Promise<Question>((resolve) => {
        socket_admin.emit("QuestionApprove", { questionId }, resolve);
      }).then((question) => {
        expect(question).toMatchObject({ ...question_matcher, approved: true });
      });

      // Wait for the question to be approved and sent to the participant(s)
      return Promise.all([participant_events, admin_callbacks]);
    });
  });
});
