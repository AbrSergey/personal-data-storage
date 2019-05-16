const mongoose = require("mongoose");
const { encryptData, decryptData, createSignature, verifySignature, setAlgorithm } = require("./encryption");
const { connect, disconnect, getConnect } = require("./connection");
const { copy, matchKeys, error } = require("./helpers");
const ObjectId = require("mongoose").Types.ObjectId;

let _schema_secure;
let _schema_open; //TODOs maybe Set ?
let _model;
let _key = "32345678912345678912345678912345";

function objectVerifyForm(obj){
  let objVerify = {};
  objVerify._id = obj._id;
  objVerify.security = obj.security;
  Object.keys(_schema_open).forEach( key => objVerify[key] = obj[key] );
  return objVerify;
}

//TODOs delete first argument
function keyValueOpenSchema(openPart, object){
  Object.keys(_schema_open).forEach( key => openPart[key] = object[key] );
  return openPart;
}

//TODOs delete first argument
function keyValueSecureSchema(securePart, object){
  Object.keys(_schema_secure).forEach( key => securePart[key] = object[key] );
  return securePart;
}

function insert(data, opts){
  if (data){
    if (getConnect()){
      let openPart = {};
      let securePart = {};
      openPart = keyValueOpenSchema(openPart, data);
      securePart = keyValueSecureSchema(securePart, data);

      let object = {
        ...openPart,
        security: securePart
      };


      object._id = mongoose.Types.ObjectId();
      object.security.id = object._id;
      object.security = encryptData(object.security, _key);
      object.signature = createSignature(object, _key);

      const instance = new _model(object);
      return new Promise(async (resolve, reject) => {
        console.log(opts)
        const resp = await instance.save(opts).catch(err => error("insert", err));
        resolve(resp._id);
      });
    }
    else error("insert", "please connect to database");
  }
  else error("insert", "data is undefined");
}

async function update(id, data, opts){
  if (id && data){
    if (getConnect()){
      const [ object ] = await _model.find({ _id: id }).exec().catch(err => error("update", err));
      if (!object) return {};

      if (verifySignature(objectVerifyForm(object), object.signature, _key)){
        let openPart = {};
        let securePart = {};

        openPart = keyValueOpenSchema(openPart, object);
        openPart._id = object._id;

        const openKeys = matchKeys(_schema_open, data);
        if (openKeys.length) openKeys.forEach(key => openPart[key] = data[key]);

        const secureKeys = matchKeys(_schema_secure, data);
        if (secureKeys.length){
          securePart = decryptData(object.security, _key);
          secureKeys.forEach(key => securePart[key] = data[key]);
          securePart = encryptData(securePart, _key);
        }
        else securePart = object.security;

        let resObject = {
          ...openPart,
          security: securePart
        };
        resObject.signature = createSignature(resObject, _key);

        let options = { };
        if (options) options = opts;
        options.useFindAndModify = false;

        const resp = await _model.findOneAndUpdate({ _id: id }, resObject, opts).catch(err => error("update", err));
        return new Promise(async (resolve, reject) => {
          resolve(resp._id);
        });
      }
      else error("update", "verifySignature failed");
    }
    else error("update", "please connect to database");
  }
  else error("update", "id || data is undefined");
}

module.exports = {
  connect: (url, schema, modelName, key, dbOptions, schemaOptions, algorithm) => {
    // TODOs getConnect checking
    if (algorithm) setAlgorithm(algorithm);
    if (key) _key = key;

    const newSchema = new mongoose.Schema({
      ...schema.obj,
      security: { type: String },
      signature: { type: Buffer }
    },{
      timestamps: {
        createdAt: "createdAt",
        updatedAt: "updatedAt"
      }, schemaOptions });

    _model = mongoose.model(modelName, newSchema);

    _schema_secure = { ...schema.obj.security };
    _schema_open = { ...schema.obj };
    delete _schema_open.security;

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
      console.log("[personal-data-storage] - upsert() - options must be as object");
      opts = undefined;
    }
    if (!data) error("upsert", "no data for upsert");
    return data.id ? update(data.id, data, opts) : insert(data, opts);
  },

  get: (id) => {
    if (id){
      if (getConnect()) {
        if (ObjectId.isValid(id)){

          return new Promise(async (resolve, reject) => {
            const [ object ] = await _model.find({ _id: id }).exec().catch(err => error("get", err));
            if (!object) return resolve({ });

            if (verifySignature(objectVerifyForm(object), object.signature, _key)){
              const secData = decryptData(object.security, _key);
              let allData = { ...secData };
              keyValueOpenSchema(allData, object);
              resolve(allData);
            }
            else error("get", "verifySignature failed");

          });
        }
        else error("get", "id is not ObjectId");
      }
      else error("get", "please connect to database");
    }
    else error("get", "no query to find");
  },

  delete: (id) => {
    if (id){
      if (getConnect()) {
        if (ObjectId.isValid(id)){
          return new Promise(async (resolve, reject) => {
            const [ object ] = await _model.find({ _id: id }).exec().catch(err => error("delete", "find by id"));
            if (!object) return resolve({ });

            if (verifySignature(objectVerifyForm(object), object.signature, _key))
              resolve(_model.deleteOne({ _id: id }));
            else reject("verifySignature failed, record didn't delete");
          });
        }
        else error("delete", "please connect to database");
      }
      else error("delete", "no query to find");
    }
  },

  startTransaction: () => {
    return new Promise(async (resolve, reject) => {
      const session = await _model.startSession();
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
