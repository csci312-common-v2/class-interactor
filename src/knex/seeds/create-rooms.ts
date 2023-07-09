import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("Room").del();

  // Inserts seed entries
  await knex("Room").insert([
    { visibleId: "d4252388-68ab-4c2d-a7e8-58913c3b6836", name: "CS312S23" },
    { visibleId: "e5191be1-bd00-4842-b192-7526223cf04c", name: "CS416S23" },
  ]);
}
