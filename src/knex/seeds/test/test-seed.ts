import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("Room").del();
  await knex("User").del();
  await knex("Roster").del();

  // Inserts seed entries
  const roomIds = await knex("Room").insert(
    [{ visibleId: "a418c099-4114-4c55-8a5b-4a142c2b26d1", name: "TestClass" }],
    ["id"]
  );

  const userIds = await knex("User").insert(
    [
      {
        googleId: "1234567890",
        name: "Middlebury Panther",
        email: "panther@middlebury.edu",
      },
    ],
    ["id"]
  );

  // Make Middlebury Panther an administrator of TestClass
  await knex("Roster").insert([
    { userId: userIds[0].id, roomId: roomIds[0].id, role: "administrator" },
  ]);
}
