import BaseModel from "./BaseModel";

export default class AnonUser extends BaseModel {
  id!: number;

  static tableName = "AnonUser";

  static get jsonSchema() {
    return {
      type: "object",

      properties: {
        id: { type: "integer" },
      },
    };
  }
}
