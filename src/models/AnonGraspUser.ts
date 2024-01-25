import { Model } from "objection";
import BaseModel from "./BaseModel";

export default class AnonGraspUser extends BaseModel {
  id!: number;
  cookie_value!: string;

  static tableName = "AnonGraspUser";

  static get jsonSchema() {
    return {
      type: "object",

      properties: {
        id: { type: "integer" },
        cookie_value: { type: "string", format: "uuid" },
      },
    };
  }
}
