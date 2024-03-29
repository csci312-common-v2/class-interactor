import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create the AnonUser table
  await knex.schema.createTable("AnonUser", (table) => {
    table.increments("id").primary();
  });

  // Add the foreign key to the GraspReaction table
  return knex.schema.alterTable("GraspReaction", (table) => {
    table.integer("anon_user_id").unsigned().references("AnonUser.id");
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove the foreign key from the GraspReaction table
  await knex.schema.alterTable("GraspReaction", (table) => {
    table.dropColumn("anon_user_id");
  });

  return knex.schema.dropTableIfExists("AnonUser");
}
