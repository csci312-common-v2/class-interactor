import { Model, AjvValidator } from "objection";
import addFormats from "ajv-formats";
import { knex } from "../knex/knex";

class BaseModel extends Model {
  static createValidator() {
    return new AjvValidator({
      onCreateAjv: (ajv) => {
        addFormats(ajv);
      },
    });
  }
}

Model.knex(knex);

export default BaseModel;
