import { Model } from "objection";
import BaseModel from "./BaseModel";
import Account from "./Account";

export default class User extends BaseModel {
  id!: number;
  name!: string;
  email!: string;
  accounts!: Account[];

  static tableName = "User";

  static get jsonSchema() {
    return {
      type: "object",

      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        email: { type: "string" },
      },
    };
  }

  // Making this a function instead of a static property prevents a circular dependency
  // https://github.com/Vincit/objection.js/issues/2029#issuecomment-813048939
  static relationMappings = () => ({
    accounts: {
      relation: Model.HasManyRelation,
      modelClass: Account,
      join: {
        from: "User.id",
        to: "Account.userId",
      },
    },
  });
}
