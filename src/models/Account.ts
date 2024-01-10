import { Model } from "objection";
import BaseModel from "./BaseModel";
import User from "./User";

export default class Account extends BaseModel {
  id!: number;
  provider!: string;
  providerId!: string;
  userId!: number;

  static tableName = "Account";

  static get jsonSchema() {
    return {
      type: "object",
      required: ["provider", "providerId", "userId"],

      properties: {
        id: { type: "integer" },
        provider: { type: "string" },
        providerId: { type: "string" },
        userId: { type: "integer" },
      },
    };
  }

  // Making this a function instead of a static property prevents a circular dependency
  // https://github.com/Vincit/objection.js/issues/2029#issuecomment-813048939
  static relationMappings = () => ({
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: "Account.userId",
        to: "User.id",
      },
    },
  });
}
