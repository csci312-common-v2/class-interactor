import { Model } from "objection";
import BaseModel from "./BaseModel";

export default class AnonGraspUser extends BaseModel {
  id!: number;

  static tableName = "AnonGraspUser";

  static get jsonSchema() {
    return {
      type: "object",

      properties: {
        id: { type: "integer" },
      },
    };
  }
}
