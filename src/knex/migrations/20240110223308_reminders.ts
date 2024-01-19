import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("Reminder", (table) => {
    table.increments("id").primary();
    table
      .integer("roomId")
      .references("id")
      .inTable("Room")
      .notNullable()
      .onDelete("cascade");
    table.string("title").notNullable();
    table.string("description");
    table.timestamp("start_time").defaultTo(knex.fn.now());
    table.timestamp("end_time");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("Reminder");
}
