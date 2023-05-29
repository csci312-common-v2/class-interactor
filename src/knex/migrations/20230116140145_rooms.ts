import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .createTable("Room", (table) => {
      table.uuid("id").primary();
      table.string("name").notNullable();
    })
    .createTable("Poll", (table) => {
      table.increments("id").primary();
      table
        .uuid("roomId")
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
