import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
    // Deletes ALL existing entries
    await knex("Room").del();

    // Inserts seed entries
    await knex("Room").insert([
        { id: "d4252388-68ab-4c2d-a7e8-58913c3b6836", name: "CS311AS23" },
    ]);
};
