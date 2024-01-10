import { Model } from "objection";
import BaseModel from "./BaseModel";
import User from "./User";

export default class Room extends BaseModel {
  id!: number;
  name!: string;
  visibleId!: string;
  users!: User[];

  static tableName = "Room";

  static get jsonSchema() {
    return {
      type: "object",
      required: ["name", "visibleId"],

      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        visibleId: { type: "string", format: "uuid" },
      },
    };
  }

  static get relationMappings() {
    return {
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: "Room.id",
          through: {
            from: "Roster.roomId",
            to: "Roster.userId",
            // When fetching users make sure to include "role" from the join table
            extra: ["role"],
          },
          to: "User.id",
        },
      },
    };
  }
}
