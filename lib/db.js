const mongoose = require("mongoose");
const crypto = require("crypto");
const { encryptData, decryptData, createSignature, verifySignature } = require("./encryption");
const { connect, disconnect, getConnect } = require("./connection");
const { copy, matchKeys, error } = require("./helpers");
const ObjectId = require('mongoose').Types.ObjectId;

let _schema;
let _schema_secure;
let _model;
let _algorithm = "aes-256-cbc";
let _key = "32345678912345678912345678912345";
let _salt = "salt";
let _keyLen = 32;

exports.db = {
  connect: (url, schema, modelName) => {

    //getConnect checking

    const newSchema = new mongoose.Schema({
      ...schema.obj,
      security: { type: String },
      signature: { type: Buffer }
    });

    _schema = { ...schema.obj }
    _schema_secure = _schema.security;
    delete _schema.security

    _model = mongoose.model(modelName, newSchema);
    return connect(url); //promise
  },

  close: () => {
    disconnect();
  },

  isConnected: () => {
    return getConnect();
  },

  insert: (data) => {
    if (getConnect()){
      if (data && data.security){
        let object = copy(data);

        object._id = mongoose.Types.ObjectId();
        object.security.id = object._id;
        object.security = encryptData(object.security, _algorithm, _key);
        object.signature = createSignature(object, _key);

        let instance = new _model(object);
        return instance.save(); //promise
      }
      else error("insert", "data or data.security is undefined");
    }
    else error("insert", "please connect to database");
  },

  update: async (id, data) => {
    if (id && data){
      if (getConnect()){
        let [ object ] = await _model.find({ _id: id }).exec().catch(err => error("update", "find by id"));
        if (!object) return resolve({ });

        let objVerify = {};
        objVerify._id = object._id;
        objVerify.security = object.security;
        Object.keys(_schema).forEach( key => objVerify[key] = object[key] );

        if (verifySignature(objVerify, object.signature, _key)){
          let openPart = {};
          let securePart;

          Object.keys(_schema).forEach( key => openPart[key] = object[key] );
          openPart._id = object._id;

          const openKeys = matchKeys(_schema, data);
          if (openKeys.length){
            openKeys.forEach(key => openPart[key] = data[key]);
          }

          const secureKeys = matchKeys(_schema_secure, data);
          if (secureKeys.length){
            securePart = decryptData(object.security, _algorithm, _key);
            secureKeys.forEach(key => securePart[key] = data[key]);
            securePart = encryptData(securePart, _algorithm, _key);
          }
          else securePart = object.security;

          let resObject = {
            ...openPart,
            security: securePart
          }

          resObject.signature = createSignature(resObject, _key);

          let instance = new _model();
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
            let [ object ] = await _model.find({ _id: id }).exec();
            if (!object) return resolve({ });

            let objVerify = {};
            objVerify._id = object._id;
            objVerify.security = object.security;
            Object.keys(_schema).forEach( key => objVerify[key] = object[key] );

            if (verifySignature(objVerify, object.signature, _key)){
              const secData = decryptData(object.security, _algorithm, _key);
              let allData = { ...secData};
              Object.keys(_schema).forEach( key => allData[key] = object[key] );

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
  }
}
