const Engine = require("./engine");
const { connect, disconnect, getConnect } = require("./connect");
const { deleteUndefinedKey } = require("./helpers");
const ObjectId = require("mongoose").Types.ObjectId;
const PersonalDataStorageError = require("./PersonalDataStorageError");

let engine;

module.exports = {
  connect: async (url, schema, modelName, key, dbOptions, schemaOptions) => {
    if (!key) throw new PersonalDataStorageError("Key must not be undefined!");
    engine = new Engine(key);
    await engine.generateModel(schema, modelName, schemaOptions);
    await connect(url, dbOptions);
    return engine.setIndexSettings(schema, dbOptions);
  },

  close: () => {
    disconnect();
  },

  isConnected: () => {
    return getConnect();
  },

  upsert: async (data, opts) => {
    if (!getConnect()) throw new PersonalDataStorageError("No connection to MongoDb!");
    if (opts && typeof opts !== "object"){
      console.log("\x1b[33m%s\x1b[0m","\n[personal-data-storage] - WARNING - options must be as object. Applied options by default\n");
      opts = undefined;
    }
    deleteUndefinedKey(data);
    if (!data) throw new PersonalDataStorageError("No data for upsert");
    // await validateData(data);
    return data.id ? engine.update(data.id, data, opts) : engine.insert(data, opts); // promise
  },

  get: async (id) => {
    if (!id) throw new PersonalDataStorageError("No id to find");
    if (!getConnect()) throw new PersonalDataStorageError("No connection to MongoDb!");
    if (!ObjectId.isValid(id)) throw new PersonalDataStorageError("id is not ObjectId!", 400);
    return engine.getDataByID(id); //promise
  },

  find: async (key, value) => {
    if (!key) throw new PersonalDataStorageError("No key to find");
    if (!value) throw new PersonalDataStorageError("No value to find");
    return engine.find(key, value); //promise
  },

  delete: async (id) => {
    if (!id) throw new PersonalDataStorageError("No id to delete");
    if (!getConnect()) throw new PersonalDataStorageError("No connection to MongoDb!");
    if (!ObjectId.isValid(id)) throw new PersonalDataStorageError("id is not ObjectId!", 400);
    return engine.deleteById(id); //promise
  }
};