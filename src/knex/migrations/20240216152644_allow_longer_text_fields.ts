import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("Reminder", (table) => {
    // Allow variable length text fields (default is 255)
    table.specificType("description", "varchar").alter();
  });
  await knex.schema.alterTable("Question", (table) => {
    // Allow variable length text fields (default is 255)
    table.specificType("question", "varchar").alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Reset original field types
  await knex.schema.alterTable("Reminder", (table) => {
    table.string("description").alter();
  });
  await knex.schema.alterTable("Question", (table) => {
    table.string("question").alter();
  });
}
