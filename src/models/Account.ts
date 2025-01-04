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
      // We should think of required as those properties that are required to create
      // a new instance of the model, not those that are required in the database.
      // https://github.com/Vincit/objection.js/issues/393#issuecomment-305474345
      required: ["provider", "providerId"],

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
