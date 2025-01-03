/**
 * @vitest-environment node
 *
 * These are exclusively server-side tests and so we use the Node environment
 * for server-side tests to avoid loading browser libraries
 */

import * as http from "http";
import { AddressInfo } from "net";
import { Server } from "socket.io";
import { default as Client, Socket as ClientSocket } from "socket.io-client";
import { getToken } from "next-auth/jwt";
import { knex } from "@/knex/knex";
import { getNamespace, bindListeners } from "./socket";
import GraspReaction from "@/models/GraspReaction";

// Mock the NextAuth package
vi.mock("next-auth/jwt");
const mockedGetToken = vi.mocked(getToken);

function allEvents(socket: ClientSocket, events: string[]) {
  // Return a promise that resolves when all events have been received
  return Promise.all(
    events.map(
      (event) =>
        new Promise((resolve) => {
          socket.on(event, resolve);
        }),
    ),
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
  }, 20000);

  afterAll(async () => {
    await new Promise((resolve) => {
      socket_server.close(resolve);
    });

    // To prevent a warning message from vi about a process failing to exit
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

    // Clear all mocks between tests
    vi.resetAllMocks();
  });

  describe("Without authenticated user", () => {
    beforeEach(() => {
      // Mock getToken to simulate an unauthenticated connection
      mockedGetToken.mockResolvedValue(null);
    });

    test("Unauthenticated user can connect to participant channel", () => {
      const { address, port } = server.address() as AddressInfo;
      socket_client = Client(
        `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1`,
        {
          autoConnect: false,
        },
      );

      // Register event handlers before we connect so no events are missed
      const events = allEvents(socket_client, ["connect", "RoomJoined"]).then(
        () => {
          // Make sure all expected events have been received
          expect(socket_client.connected).toBe(true);
        },
      );

      socket_client.connect();

      // Return promise waiting on all events to be received. Test will fail if
      // promise is rejected.
      return events;
    });

    test("Unauthenticated user can't connect to admin channel", () => {
      const { address, port } = server.address() as AddressInfo;
      socket_client = Client(
        `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1/admin`,
        {
          autoConnect: false,
        },
      );

      const events = new Promise((resolve, reject) => {
        socket_client.on("connect_error", (error) => {
          reject(error);
        });
      });

      socket_client.connect();

      return expect(events).rejects.toEqual(
        new Error("Unable to authenticate user"),
      );
    });

    test("User that is not the administrator can't connect to the admin channel", () => {
      mockedGetToken.mockResolvedValue({
        id: 2,
      });

      const { address, port } = server.address() as AddressInfo;
      socket_client = Client(
        `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1/admin`,
        {
          autoConnect: false,
        },
      );

      const events = new Promise((resolve, reject) => {
        socket_client.on("connect_error", (error) => {
          reject(error);
        });
      });

      socket_client.connect();

      return expect(events).rejects.toEqual(
        new Error("User is not an administrator of this room"),
      );
    });
  });

  describe("With authenticated user", () => {
    beforeEach(() => {
      // Mock getToken to simulate an authenticated connection
      mockedGetToken.mockResolvedValue({
        id: 1,
      });
    });

    describe("Room connection", () => {
      test.each(["", "/admin"])("Connects to valid room (%s)", (admin) => {
        const { address, port } = server.address() as AddressInfo;
        socket_client = Client(
          `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1${admin}`,
          {
            autoConnect: false,
          },
        );

        const events = allEvents(socket_client, ["connect", "RoomJoined"]).then(
          () => {
            expect(socket_client.connected).toBe(true);
          },
        );

        socket_client.connect();

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
          },
        );

        socket_client.connect();

        return events;
      });
    });

    describe("Polling response", () => {
      let poll: Poll;
      beforeEach(async () => {
        // Add a pending question to the database
        const [{ id: roomId }] = await knex("Room")
          .select("id")
          .where("visibleId", "a418c099-4114-4c55-8a5b-4a142c2b26d1");
        [poll] = await knex("Poll").insert(
          {
            roomId,
            values: { A: 0, B: 0, C: 0, D: 0, E: 0 },
          },
          ["*"],
        );
      });

      test.each([[""], ["/admin"]])(
        "Active polls are sent on connection to room (%s)",
        (admin) => {
          const { address, port } = server.address() as AddressInfo;
          socket_client = Client(
            `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1${admin}`,
            {
              autoConnect: false,
            },
          );

          // Everyone should receive any pending polls when they connect
          const events = allEvents(socket_client, [
            "PollStart",
            "connect",
            "RoomJoined",
          ]).then(([poll]) => {
            expect(poll).toMatchObject({
              id: (poll as Poll).id,
            });
          });
          socket_client.connect();
          return events;
        },
      );

      test("Poll response updates the counts", async () => {
        const { address, port } = server.address() as AddressInfo;
        socket_client = Client(
          `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1`,
          {
            autoConnect: false,
          },
        );

        socket_admin = Client(
          `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1/admin`,
          {
            autoConnect: false,
          },
        );

        const initialized = Promise.all([
          allEvents(socket_admin, ["PollStart", "connect", "RoomJoined"]),
          allEvents(socket_client, ["PollStart", "connect", "RoomJoined"]),
        ]);

        socket_client.connect();
        socket_admin.connect();

        // Wait for both clients to be fully initialized
        await initialized;

        // The admin channel should received updated counts
        const admin_events = new Promise<Question[]>((resolve) => {
          socket_admin.off("PollResults").on("PollResults", resolve);
        }).then((values) => {
          expect(values).toMatchObject({
            A: 0,
            B: 1,
            C: 0,
            D: 0,
            E: 0,
          });
        });

        // Respond to a poll as a participants (with unrecorded previous choice of 'A' that should be ignored
        // to prevent counts below 0)
        const participant_callbacks = new Promise((resolve) => {
          socket_client.emit(
            "PollResponse",
            { id: poll.id, prevChoice: "A", newChoice: "B" },
            resolve,
          );
        }).then((success) => {
          expect(success).toMatchObject({ choice: "B" });
        });

        // Wait for the response and update
        await Promise.all([admin_events, participant_callbacks]);
      });
    });

    describe("Question submission", () => {
      let question: Question;
      beforeEach(async () => {
        // Add a pending question to the database
        const [{ id: roomId }] = await knex("Room")
          .select("id")
          .where("visibleId", "a418c099-4114-4c55-8a5b-4a142c2b26d1");
        [question] = await knex("Question").insert(
          {
            roomId,
            question: "Test question",
            anonymous: true,
          },
          ["*"],
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
            },
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
        },
      );

      test("Removing a submitted, approved question should remove it from all views", async () => {
        const { address, port } = server.address() as AddressInfo;
        socket_client = Client(
          `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1`,
          {
            autoConnect: false,
          },
        );

        socket_admin = Client(
          `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1/admin`,
          {
            autoConnect: false,
          },
        );

        const initialized = Promise.all([
          allEvents(socket_admin, ["QuestionNew", "connect", "RoomJoined"]),
          allEvents(socket_client, ["QuestionNew", "connect", "RoomJoined"]),
        ]);

        socket_client.connect();
        socket_admin.connect();

        // Wait for both clients to be fully initialized
        await initialized;

        // Specify expected shape of the question object using vi matchers
        const question_matcher = {
          id: expect.any(Number),
          question: "A new question",
          anonymous: true,
          approved: false,
          votes: 0,
          created_at: expect.any(String),
        };

        // The admin channel should receive the question for approval
        const admin_question_events = new Promise<Question[]>((resolve) => {
          socket_admin.off("QuestionNew").on("QuestionNew", resolve);
        }).then((questions) => {
          expect(questions).toHaveLength(1);
          expect(questions[0]).toMatchObject(question_matcher);
          return questions[0].id;
        });

        // Send in a new question as a participant
        const participant_question_callbacks = new Promise((resolve) => {
          socket_client.emit(
            "QuestionAsk",
            { question: "A new question", anonymous: true },
            resolve,
          );
        }).then((success) => {
          expect(success).toBe(true);
        });

        // Wait for the question to be asked and sent for approval
        const [questionId] = await Promise.all([
          admin_question_events,
          participant_question_callbacks,
        ]);

        // If the admin approves the question it should be sent to the participant(s)
        const participant_approve_events = new Promise<Question[]>(
          (resolve) => {
            socket_client.off("QuestionNew").on("QuestionNew", resolve);
          },
        ).then((questions) => {
          expect(questions).toHaveLength(1);
          expect(questions[0]).toMatchObject({
            ...question_matcher,
            approved: true,
          });
        });

        const admin_approve_callbacks = new Promise<Question>((resolve) => {
          socket_admin.emit("QuestionApprove", { questionId }, resolve);
        }).then((question) => {
          expect(question).toMatchObject({
            ...question_matcher,
            approved: true,
          });
        });

        // Wait for the question to be approved and sent to the participant(s)
        await Promise.all([
          participant_approve_events,
          admin_approve_callbacks,
        ]);

        // If the admin removes the question it should be removed from all views
        const admin_remove_callbacks = new Promise<Question>((resolve) => {
          socket_admin.emit("QuestionRemove", { questionId }, resolve);
        }).then((removedQuestionId) => {
          expect(typeof removedQuestionId).toBe("number");
        });

        // Wait for the question to be removed and confirmed by the admin
        return Promise.all([admin_remove_callbacks]);
      });
    });

    describe("Grasp reactions", () => {
      type Count = {
        level: "good" | "unsure" | "lost";
        count: number;
      };

      function findCountByLevel(counts: Count[], level: string) {
        return counts.find((entry) => entry.level === level)!.count;
      }

      beforeEach(async () => {
        // Mocked timestamp
        vi.spyOn(Date, "now").mockImplementation(() => 1673942400000);

        const [{ id: roomId }] = await knex("Room")
          .select("id")
          .where("visibleId", "a418c099-4114-4c55-8a5b-4a142c2b26d1");

        const [{ id: userId }] = await knex
          .table("AnonUser")
          .insert({})
          .returning("*");

        // Purposefully out of chronological order since database should order by sent_at timestamp
        const graspReactions = [
          {
            level: "lost",
            sent_at: new Date(Date.now() - 5 * 60 * 1000),
          },
          {
            level: "unsure",
            sent_at: new Date(Date.now()),
          },
          {
            level: "good",
            sent_at: new Date(Date.now() - 3 * 60 * 1000),
          },
        ];

        const graspReactionEntries = graspReactions.map((graspReaction) => ({
          level: graspReaction.level,
          sent_at: graspReaction.sent_at,
          room_id: roomId,
          is_active: true,
          anon_user_id: userId,
        }));

        await knex("GraspReaction").insert(graspReactionEntries, ["*"]);
      });

      afterEach(() => {
        vi.spyOn(Date, "now").mockRestore();
      });

      test("Data based on active grasp reactions are sent on connection to admin", async () => {
        const { address, port } = server.address() as AddressInfo;
        socket_admin = Client(
          `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1/admin`,
          {
            autoConnect: false,
          },
        );

        const events = allEvents(socket_admin, [
          "GraspReactionGet",
          "connect",
          "RoomJoined",
        ]).then((value: unknown[]) => {
          const graspReactionGetResults = value[0];
          const counts = graspReactionGetResults as Count[];

          counts.forEach((entry) => {
            expect(typeof entry.level).toBe("string");
            expect(typeof entry.count).toBe("number");
          });

          // Check that the count of 'good' and 'lost' is 0 and 'unsure' is not 0
          // Based on the beforeEach data
          expect(findCountByLevel(counts, "good")).toBe(0);
          expect(findCountByLevel(counts, "unsure")).not.toBe(0);
          expect(findCountByLevel(counts, "lost")).toBe(0);
        });

        socket_admin.connect();
        return events;
      });

      test("Resetting grasp reactions sets all is_active to false", async () => {
        const [{ id: roomId }] = await knex("Room")
          .select("id")
          .where("visibleId", "a418c099-4114-4c55-8a5b-4a142c2b26d1");

        // Connect to the server
        const { address, port } = server.address() as AddressInfo;

        socket_admin = Client(
          `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1/admin`,
          {
            autoConnect: false,
          },
        );

        // Initialize the clients
        const initialized = Promise.all([
          allEvents(socket_admin, [
            "GraspReactionGet",
            "connect",
            "RoomJoined",
          ]),
        ]);

        socket_admin.connect();

        // Wait for both clients to be fully initialized
        await initialized;

        // Emit the GraspReactionReset event from the admin client
        const admin_reset_callback = new Promise<void>((resolve) => {
          socket_admin.emit("GraspReactionReset", {}, resolve);
        });

        // Listen for the GraspReactionReset event on the admin
        const client_reset_event = new Promise<void>((resolve) => {
          socket_admin
            .off("GraspReactionReset")
            .on("GraspReactionReset", async () => {
              // Query the database for the values you want to verify
              const reactions = await GraspReaction.query().where(
                "room_id",
                roomId,
              );

              // Check the returned values against the expected values
              reactions.forEach((reaction) => {
                expect(reaction.is_active).toBe(false);
              });

              resolve();
            });
        });

        // Verify that the event is received and the reactions are reset
        await Promise.all([admin_reset_callback, client_reset_event]);
      });

      test("Admin receives GraspReactionSend from client", async () => {
        const [{ id: roomId }] = await knex("Room")
          .select("id")
          .where("visibleId", "a418c099-4114-4c55-8a5b-4a142c2b26d1");

        // Connect to the server
        const { address, port } = server.address() as AddressInfo;

        socket_admin = Client(
          `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1/admin`,
          {
            autoConnect: false,
          },
        );

        socket_client = Client(
          `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1`,
          {
            autoConnect: false,
          },
        );

        // Initialize the clients
        const initialized = Promise.all([
          allEvents(socket_admin, [
            "GraspReactionGet",
            "connect",
            "RoomJoined",
          ]),
          allEvents(socket_client, ["connect", "RoomJoined"]),
        ]);

        socket_admin.connect();
        socket_client.connect();

        // Wait for both clients to be fully initialized
        await initialized;

        const [{ id: userId }] = await knex
          .table("AnonUser")
          .insert({})
          .returning("*");

        // Emit the GraspReactionSend event from the participant client
        const participant_send_callback = new Promise<void>((resolve) => {
          socket_client.emit(
            "GraspReactionSend",
            {
              level: "good",
              sent_at: new Date(Date.now()),
            },
            resolve,
          );
        }).then((success) => {
          expect(success).toBe(true);
        });

        // Listen for the GraspReactionGet event on the admin
        const client_send_event = new Promise<Count[]>((resolve) => {
          socket_admin.off("GraspReactionGet").on("GraspReactionGet", resolve);
        }).then((counts) => {
          counts.forEach((entry) => {
            expect(typeof entry.level).toBe("string");
            expect(typeof entry.count).toBe("number");
          });

          // Check that the count of 'lost' is 0 and 'good' and 'unsure' is not 0
          // Based on the beforeEach data and newly sent grasp reaction
          expect(findCountByLevel(counts, "good")).not.toBe(0);
          expect(findCountByLevel(counts, "unsure")).not.toBe(0);
          expect(findCountByLevel(counts, "lost")).toBe(0);
        });

        // Verify that the event is received and the reactions are reset
        await Promise.all([participant_send_callback, client_send_event]);
      });
    });
  });
});
