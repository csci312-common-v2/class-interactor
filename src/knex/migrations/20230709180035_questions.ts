import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("Question", (table) => {
    table.increments("id").primary();
    table
      .integer("roomId")
      .references("id")
      .inTable("Room")
      .notNullable()
      .onDelete("cascade");
    table.string("question").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.integer("votes").defaultTo(0);
    table.boolean("anonymous");
    table.boolean("approved").defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("Question");
}
