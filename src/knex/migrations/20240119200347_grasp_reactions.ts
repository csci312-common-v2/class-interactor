import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("GraspReaction", (table) => {
    table.increments("id").primary();
    table.enu("level", ["good", "unsure", "lost"]).notNullable();
    table.timestamp("sent_at").notNullable();
    table
      .integer("room_id")
      .references("id")
      .inTable("Room")
      .notNullable()
      .onDelete("cascade");
    table.boolean("is_active").defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("GraspReaction");
}
