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
import { getToken } from "next-auth/jwt";
import { knex } from "@/knex/knex";
import { getNamespace, bindListeners } from "./socket";

// Mock the NextAuth package
jest.mock("next-auth/jwt");
const mockedGetToken = jest.mocked(getToken);

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

    // Clear all mocks between tests
    jest.resetAllMocks();
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

    test("Unauthetnicated user can't connect to admin channel", () => {
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

        // Respond to a poll as a participants
        const participant_callbacks = new Promise((resolve) => {
          socket_client.emit(
            "PollResponse",
            { id: poll.id, newChoice: "B" },
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

    describe("Reminder posting", () => {
      let reminder: Reminder;

      beforeEach(async () => {
        // TO-DO: Mock the times

        // Add a reminder to the database
        const [{ id: roomId }] = await knex("Room")
          .select("id")
          .where("visibleId", "a418c099-4114-4c55-8a5b-4a142c2b26d1");

        const reminders = [
          {
            roomId,
            title: "Active Reminder 1",
            description: "Active Description 1",
            start_time: new Date(Date.now() - 1 * 60 * 60 * 1000),
            end_time: null,
          },
          {
            roomId,
            title: "Active Reminder 2",
            description: "Active Description 2",
            start_time: new Date(Date.now() - 1 * 60 * 60 * 1000),
            end_time: new Date(Date.now() + 1 * 60 * 60 * 1000),
          },
          {
            roomId,
            title: "Inactive Reminder 1",
            description: "Inactive Description 1",
            start_time: new Date(Date.now() + 1 * 60 * 60 * 1000),
            end_time: null,
          },
          {
            roomId,
            title: "Inactive Reminder 2",
            description: "Inactive Description 2",
            start_time: new Date(Date.now() - 2 * 60 * 60 * 1000),
            end_time: new Date(Date.now() - 1 * 60 * 60 * 1000),
          },
        ];

        await Promise.all(
          reminders.map((reminder) =>
            knex("Reminder").insert(
              {
                roomId,
                title: reminder.title,
                description: reminder.description,
                start_time: reminder.start_time,
                end_time: reminder.end_time,
              },
              ["*"],
            ),
          ),
        );
      });

      test.each([
        ["", 2],
        ["/admin", 4],
      ])(
        "Active reminders are sent on connection to room (%s)",
        (admin, numReminders) => {
          const { address, port } = server.address() as AddressInfo;
          socket_client = Client(
            `http://[${address}]:${port}/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1${admin}`,
            {
              autoConnect: false,
            },
          );

          // Admin see all reminders
          // Participant sees active reminders
          const events = allEvents(socket_client, [
            "ReminderSend",
            "connect",
            "RoomJoined",
          ]).then(([reminders]) => {
            expect(reminders).toHaveLength(numReminders);
            if (numReminders > 0) {
              const [reminder, ...rest] = reminders as Reminder[];
              expect(reminder).not.toHaveProperty("roomId");
            }
            if (admin === "") {
              const hasPastStartTime = (reminders as Reminder[]).every(
                (reminder) => {
                  return new Date(reminder.start_time) < new Date();
                },
              );
              expect(hasPastStartTime).toBe(true);

              const hasFutureEndTime = (reminders as Reminder[]).every(
                (reminder) => {
                  return reminder.end_time
                    ? new Date(reminder.end_time) > new Date()
                    : true;
                },
              );
              expect(hasFutureEndTime).toBe(true);
            }
          });
          socket_client.connect();
          return events;
        },
      );

      test("Removing an active reminder should remove it from all views", async () => {
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
          allEvents(socket_admin, ["ReminderSend", "connect", "RoomJoined"]),
          allEvents(socket_client, ["ReminderSend", "connect", "RoomJoined"]),
        ]);

        socket_client.connect();
        socket_admin.connect();

        // Wait for both clients to be fully initialized
        await initialized;

        // Specify expected shape of the reminder object using Jest matchers
        const reminder_matcher = {
          id: expect.any(Number),
          title: "A new reminder",
          description: expect.any(String),
          start_time: expect.any(String),
        };

        // If the admin sends an immediate reminder it should be sent to admin and participants(s)
        // Admin sends a reminder
        const admin_send_callbacks = new Promise<Reminder>((resolve) => {
          socket_admin.emit(
            "ReminderSend",
            {
              title: "A new reminder",
              description: "A new description",
              start_time: new Date(Date.now()),
              end_time: null,
            },
            resolve,
          );
        }).then((success) => {
          expect(success).toBe(true);
        });

        // Admin and participant see reminder
        const admin_remind_events = new Promise<Reminder[]>((resolve) => {
          socket_admin.off("ReminderSend").on("ReminderSend", resolve);
        }).then((reminders) => {
          expect(reminders).toHaveLength(1);
          expect(reminders[0]).toMatchObject({ ...reminder_matcher });
          return reminders[0].id;
        });

        const participant_remind_events = new Promise<Reminder[]>((resolve) => {
          socket_client.off("ReminderSend").on("ReminderSend", resolve);
        }).then((reminders) => {
          expect(reminders).toHaveLength(1);
          expect(reminders[0]).toMatchObject({ ...reminder_matcher });
          return reminders[0].id;
        });

        // Wait for the reminder to be send to admin and all participants
        const [status, adminReminderId, participantReminderId] =
          await Promise.all([
            admin_send_callbacks,
            admin_remind_events,
            participant_remind_events,
          ]);

        // Ensure the same reminder was sent to admin and participants
        expect(adminReminderId).toBe(participantReminderId);

        const removedReminderId = adminReminderId;

        // If the admin removes the reminder, it should be removed from all views
        const admin_remove_callbacks = new Promise<Reminder>((resolve) => {
          socket_admin.emit(
            "ReminderRemove",
            { reminderId: removedReminderId },
            resolve,
          );
        }).then((removedReminderId) => {
          expect(typeof removedReminderId).toBe("number");
        });

        // Reminder is removed from admin and participant views
        const admin_remove_events = new Promise<Reminder[]>((resolve) => {
          socket_admin.off("ReminderRemoved").on("ReminderRemoved", resolve);
        }).then((reminder) => {
          expect(reminder).toBe(removedReminderId);
        });

        const participant_remove_events = new Promise<Reminder[]>((resolve) => {
          socket_client.off("ReminderRemoved").on("ReminderRemoved", resolve);
        }).then((reminder) => {
          expect(reminder).toBe(removedReminderId);
        });

        // Wait for the reminder to be removed and confirmed by the admin
        return Promise.all([
          admin_remove_callbacks,
          admin_remove_events,
          participant_remove_events,
        ]);
      });

      test("Removing a reminder for the future should remove it from admin view", async () => {
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
          allEvents(socket_admin, ["ReminderSend", "connect", "RoomJoined"]),
          allEvents(socket_client, ["ReminderSend", "connect", "RoomJoined"]),
        ]);

        socket_client.connect();
        socket_admin.connect();

        // Wait for both clients to be fully initialized
        await initialized;

        // Specify expected shape of the reminder object using Jest matchers
        const reminder_matcher = {
          id: expect.any(Number),
          title: "A new reminder",
          description: expect.any(String),
          start_time: expect.any(String),
        };

        // If the admin sends a reminder for future it should be sent to just admin
        // Admin sends a reminder
        const admin_send_callbacks = new Promise<Reminder>((resolve) => {
          socket_admin.emit(
            "ReminderSend",
            {
              title: "A new reminder",
              description: "A new description",
              start_time: new Date(Date.now() + 1 * 60 * 60 * 1000),
              end_time: null,
            },
            resolve,
          );
        }).then((success) => {
          expect(success).toBe(true);
        });

        // Admins see the reminder
        const admin_remind_events = new Promise<Reminder[]>((resolve) => {
          socket_admin.off("ReminderSend").on("ReminderSend", resolve);
        }).then((reminders) => {
          expect(reminders).toHaveLength(1);
          expect(reminders[0]).toMatchObject({ ...reminder_matcher });
          return reminders[0].id;
        });

        // Participants should not receive the reminder
        const participant_remind_events = new Promise<Reminder[]>(
          (resolve, reject) => {
            socket_client.off("ReminderSend").on("ReminderSend", () => {
              reject(
                new Error("Received ReminderSend event for a future reminder."),
              );
            });
          },
        );

        // Wait for the reminder to be send to admin
        const [status, adminReminderId] = await Promise.all([
          admin_send_callbacks,
          admin_remind_events,
        ]);

        const removedReminderId = adminReminderId;

        // If the admin removes the reminder, it should be removed from admin views
        const admin_remove_callbacks = new Promise<Reminder>((resolve) => {
          socket_admin.emit(
            "ReminderRemove",
            { reminderId: removedReminderId },
            resolve,
          );
        }).then((removedReminderId) => {
          expect(typeof removedReminderId).toBe("number");
        });

        // Reminder is removed from admin
        const admin_remove_events = new Promise<Reminder[]>((resolve) => {
          socket_admin.off("ReminderRemoved").on("ReminderRemoved", resolve);
        }).then((reminder) => {
          expect(reminder).toBe(removedReminderId);
        });

        // Wait for the reminder to be removed and confirmed by the admin
        return Promise.all([admin_remove_callbacks, admin_remove_events]);
      });
    });
  });
});
