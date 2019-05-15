const mongoose = require("mongoose");
const crypto = require("crypto");
const { encryptData, decryptData, createSignature, verifySignature, setAlgorithm } = require("./encryption");
const { connect, disconnect, getConnect } = require("./connection");
const { copy, matchKeys, error } = require("./helpers");
const ObjectId = require('mongoose').Types.ObjectId;

let _schema_secure;
let _schema_open;
let _model;
let _key = "32345678912345678912345678912345";

function objectVerifyForm(obj){
  let objVerify = {};
  objVerify._id = obj._id;
  objVerify.security = obj.security;
  Object.keys(_schema_open).forEach( key => objVerify[key] = obj[key] );
  return objVerify;
}

function keyValueOpenSchema(openPart, object){
  Object.keys(_schema_open).forEach( key => openPart[key] = object[key] );
  return openPart;
}

module.exports = {
  connect: (url, schema, modelName, key, algorithm) => {
    //getConnect checking
    if (algorithm) setAlgorithm(algorithm);
    if (key) _key = key;

    const newSchema = new mongoose.Schema({
      ...schema.obj,
      security: { type: String },
      signature: { type: Buffer }
    });
    _model = mongoose.model(modelName, newSchema);

    _schema_secure = { ...schema.obj.security };
    _schema_open = { ...schema.obj };
    delete _schema_open.security;

    return connect(url); //promise
  },

  close: () => {
    disconnect();
  },

  isConnected: () => {
    return getConnect();
  },

  insert: (data) => {
    if (data && data.security){
      if (getConnect()){
        let object = copy(data);
        object._id = mongoose.Types.ObjectId();
        object.security.id = object._id;
        object.security = encryptData(object.security, _key);
        object.signature = createSignature(object, _key);

        const instance = new _model(object);
        return new Promise(async (resolve, reject) => {
          const resp = await instance.save().catch(err => error("insert", err));
          resolve(resp._id);
        })
      }
      else error("insert", "please connect to database");
    }
    else error("insert", "data or data.security is undefined");
  },

  update: async (id, data) => {
    if (id && data){
      if (getConnect()){
        const [ object ] = await _model.find({ _id: id }).exec().catch(err => error("update", "find by id"));
        if (!object) return resolve({ });

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
          }
          resObject.signature = createSignature(resObject, _key);

          return _model.updateOne({ _id: id }, resObject, { upsert: true }); //promise
        }
        else error("update", "verifySignature failed");
      }
      else error("update", "please connect to database");
    }
    else error("update", "id || data is undefined");
  },

  find: (id) => {
    if (id){
      if (getConnect()) {
        if (ObjectId.isValid(id)){
          return new Promise(async (resolve, reject) => {
            const [ object ] = await _model.find({ _id: id }).exec().catch(err => error("find", "find by id"));
            if (!object) return resolve({ });

            if (verifySignature(objectVerifyForm(object), object.signature, _key)){
              const secData = decryptData(object.security, _key);
              let allData = { ...secData };
              keyValueOpenSchema(allData, object);
              resolve(allData);
            }
            else error("find", "verifySignature failed");
          });
        }
        else error("find", "id is not ObjectId");
      }
      else error("find", "please connect to database");
    }
    else error("find", "no query to find");
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
  }
};
