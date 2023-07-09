import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .createTable("Room", (table) => {
      table.increments("id").primary();
      table.uuid("visibleId").unique().notNullable();
      table.string("name").notNullable();
    })
    .createTable("Poll", (table) => {
      table.increments("id").primary();
      table
        .integer("roomId")
        .references("id")
        .inTable("Room")
        .notNullable()
        .onDelete("cascade");
      table.jsonb("values");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("ended_at");
    });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("Poll").dropTableIfExists("Room");
}
