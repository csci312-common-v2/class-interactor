import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Delete all existing entries and reset the sequence
  for (const name of ["Room", "User", "Account", "Question"]) {
    await knex(name).del();
    await knex.raw(`ALTER SEQUENCE "${name}_id_seq" RESTART WITH 1`);
  }
  await knex("Roster").del();

  // Inserts seed entries
  const roomIds = await knex("Room").insert(
    [{ visibleId: "a418c099-4114-4c55-8a5b-4a142c2b26d1", name: "TestClass" }],
    ["id"],
  );

  const userIds = await knex("User").insert(
    [
      {
        name: "Middlebury Panther",
        email: "panther@middlebury.edu",
      },
    ],
    ["id"],
  );

  await knex("Account").insert([
    {
      provider: "google",
      providerId: "1234567890",
      userId: userIds[0].id,
    },
  ]);

  // Make Middlebury Panther an administrator of TestClass
  await knex("Roster").insert([
    { userId: userIds[0].id, roomId: roomIds[0].id, role: "administrator" },
  ]);
}
