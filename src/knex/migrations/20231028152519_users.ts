import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .createTable("User", (table) => {
      table.increments("id").primary();
      table.string("name");
      table.text("email");
    })
    .createTable("Account", (table) => {
      table.increments("id").primary();
      table.string("provider").notNullable();
      table.string("providerId").notNullable();
      table.unique(["provider", "providerId"]);
      table
        .integer("userId")
        .references("User.id")
        .notNullable()
        .onDelete("CASCADE");
    })
    .createTable("Roster", (table) => {
      // This is syntactic sugar for table.integer("userId").references("id").inTable("User")...
      table
        .integer("userId")
        .references("User.id")
        .notNullable()
        .onDelete("CASCADE");
      table
        .integer("roomId")
        .references("Room.id")
        .notNullable()
        .onDelete("CASCADE");
      table
        .enu("role", ["administrator", "student"], {
          useNative: true,
          enumName: "roster_role_type",
        })
        .notNullable();
      table.primary(["userId", "roomId"]);
    });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .dropTable("Roster")
    .dropTable("Account")
    .dropTable("User")
    .raw("DROP TYPE roster_role_type CASCADE");
}
