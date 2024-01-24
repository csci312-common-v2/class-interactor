import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("Room").del();

  // Create rooms
  const rooms = await knex("Room")
    .insert([
      { visibleId: "d4252388-68ab-4c2d-a7e8-58913c3b6836", name: "CS312S23" },
      { visibleId: "e5191be1-bd00-4842-b192-7526223cf04c", name: "CS416S23" },
      {
        visibleId: "bf826820-e517-4c5f-a66c-35440e10b5ef",
        name: "MiddSIPSM23",
      },
      { visibleId: "d54259d4-58ba-49a3-8ab1-3c010fb0357f", name: "CS150F23" },
      { visibleId: "b66e4d6f-8281-4e50-b52e-6496218bb516", name: "CS312F23" },
      { visibleId: "dcbabf9a-39e3-422f-abcf-1531296b3082", name: "CS312S24" },
      { visibleId: "473092b1-6000-430a-b734-fbb7e37c5823", name: "CS321S24" },
    ])
    .returning("id");

  // Find and link relevant administrator if present
  const user = await knex("User")
    .where({
      email: "mlinderman@middlebury.edu",
    })
    .first("id");
  if (user) {
    await knex("Roster").insert(
      rooms.map((room) => ({
        userId: user.id,
        roomId: room.id,
        role: "administrator",
      })),
    );
  }
}
