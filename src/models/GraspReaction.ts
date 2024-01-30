import { Model } from "objection";
import BaseModel from "./BaseModel";
import Room from "./Room";
import AnonUser from "./AnonUser";

export default class GraspReaction extends BaseModel {
  id!: number;
  level!: "good" | "unsure" | "lost";
  sent_at!: Date;
  room_id!: number;
  room!: Room;
  is_active?: boolean;
  anon_user_id!: number;
  anonUser!: AnonUser;

  static tableName = "GraspReaction";

  static get jsonSchema() {
    return {
      type: "object",
      required: ["sent_at", "level", "room_id", "anon_user_id"],

      properties: {
        id: { type: "integer" },
        sent_at: { type: "string", format: "date-time" },
        level: { type: "string", enum: ["good", "unsure", "lost"] },
        room_id: { type: "integer" },
        is_active: { type: "boolean" },
        anon_user_id: { type: "integer" },
      },
    };
  }

  static get relationMappings() {
    return {
      room: {
        relation: Model.BelongsToOneRelation,
        modelClass: Room,
        join: {
          from: "GraspReaction.roomId",
          to: "Room.id",
        },
      },
      anonUser: {
        relation: Model.BelongsToOneRelation,
        modelClass: AnonUser,
        join: {
          from: "GraspReaction.anon_user_id",
          to: "AnonUser.id",
        },
      },
    };
  }
}
