import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("Room").del();

  // Inserts seed entries
  await knex("Room").insert([
    { visibleId: "a418c099-4114-4c55-8a5b-4a142c2b26d1", name: "TestClass" },
  ]);
}
