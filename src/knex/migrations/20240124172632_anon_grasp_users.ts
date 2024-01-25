import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create the AnonGraspUser table
  await knex.schema.createTable("AnonGraspUser", (table) => {
    table.increments("id").primary();
    table.uuid("cookie_value").unique().notNullable();
  });

  // Add the foreign key to the GraspReaction table
  return knex.schema.alterTable("GraspReaction", (table) => {
    table
      .integer("anon_grasp_user_id")
      .unsigned()
      .references("AnonGraspUser.id");
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove the foreign key from the GraspReaction table
  await knex.schema.alterTable("GraspReaction", (table) => {
    table.dropColumn("anon_grasp_user_id");
  });

  return knex.schema.dropTableIfExists("AnonGraspUser");
}
