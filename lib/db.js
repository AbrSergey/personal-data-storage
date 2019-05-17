const { setAlgorithm } = require("./encryption");
const { update, insert, getDataByID, deleteById, setKey, generateModel, getModel } = require("./engine");
const { connect, disconnect, getConnect } = require("./connection");
const { deleteUndefinedKey } = require("./helpers");
const ObjectId = require("mongoose").Types.ObjectId;
const PersonDataStorageError = require("./PersonDataStorageError");

module.exports = {
  connect: (url, schema, modelName, key, dbOptions, schemaOptions, algorithm) => {
    if (algorithm) setAlgorithm(algorithm);
    if (!key) throw new PersonDataStorageError("key must not be undefined!");
    setKey(key);
    generateModel(schema, modelName, schemaOptions);
    return connect(url, dbOptions); //promise
  },

  close: () => {
    disconnect();
  },

  isConnected: () => {
    return getConnect();
  },

  upsert: (data, opts) => {
    if (typeof opts !== "object"){
      console.log("[personal-data-storage] - WARNING - options must be as object. Applied options by default");
      opts = undefined;
    }
    deleteUndefinedKey(data);
    
    if (!data) throw new PersonDataStorageError("No data for upsert");
    return data.id ? update(data.id, data, opts) : insert(data, opts);
  },

  get: (id) => {
    if (!id) throw new PersonDataStorageError("No id to find");
    if (!getConnect()) throw new PersonDataStorageError("Please connect to database!");
    if (!ObjectId.isValid(id)) throw new PersonDataStorageError("id is not ObjectId!");
    return getDataByID(id); //promise
  },

  delete: (id) => {
    if (id) throw new PersonDataStorageError("No id to delete");
    if (!getConnect()) throw new PersonDataStorageError("Please connect to database!");
    if (ObjectId.isValid(id)) throw new PersonDataStorageError("id is not ObjectId!");
    return deleteById(id); //promise
  },

  startTransaction: () => {
    return new Promise(async (resolve, reject) => {
      const session = await getModel().startSession();
      session.startTransaction();
      resolve(session);
    });
  },

  commitTransaction: (session) => {
    return new Promise(async (resolve, reject) => {
      await session.commitTransaction();
      session.endSession();
      resolve();
    });
  },

  abortTransaction: (session) => {
    return new Promise(async (resolve, reject) => {
      await session.abortTransaction();
      session.endSession();
      resolve();
    });
  }
};
