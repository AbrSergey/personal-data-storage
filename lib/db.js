const mongoose = require("mongoose");
const crypto = require("crypto");
const { encryptData, decryptData, createSignature, verifySignature } = require("./encryption");
const { connect, disconnect, getConnect } = require("./connection");
const { copy, error } = require("./helpers");
const ObjectId = require('mongoose').Types.ObjectId;

let _schema;
let _model;
let _algorithm = "aes-256-cbc";
let _key = "32345678912345678912345678912345";
let _salt = "salt";
let _keyLen = 32;
let _ivLen = 16;

exports.db = {
  connect: (url, schema, modelName) => {

    //getConnect checking

    const newSchema = new mongoose.Schema({
      ...schema.obj,
      security: { type: String },
      iv: { type: Buffer },
      signature: { type: Buffer }
    });

    _schema = { ...schema.obj }
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
        [ object.security, object.iv ] = encryptData(object.security, _algorithm, _key, _ivLen);
        object.signature = createSignature(object, _key);

        let instance = new _model(object);
        return instance.save(); //promise
      }
      else error("insert", "data or data.security is undefined");
    }
    else error("insert", "please connect to database");
  },

  update: async (id, data) => {
    if (id && data && data.security){
      if (getConnect()){
        let [ object ] = await _model.find({ _id: id }).exec();
        if (!object) return resolve({ });

        let objVerify = {};
        objVerify._id = object._id;
        objVerify.security = object.security;
        objVerify.iv = object.iv;
        Object.keys(_schema).forEach( key => objVerify[key] = object[key] );

        if (verifySignature(objVerify, object.signature, _key)){
          // change data
        }
        else error("insert", "verifySignature is false");
      }
      else error("insert", "please connect to database");
    }
    else error("insert", "id || data || data.security is undefined");
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
            objVerify.iv = object.iv;
            Object.keys(_schema).forEach( key => objVerify[key] = object[key] );

            if (verifySignature(objVerify, object.signature, _key)){
              const secData = decryptData(object.security, object.iv, _algorithm, _key);
              let allData = { ...secData};
              Object.keys(_schema).forEach( key => allData[key] = object[key] );

              resolve(allData);
            }else{
              error("find", "verifySignature is false");
            }
          });

        }
        else error("find", "id is not ObjectId");
      }
      else error("find", "please connect to database");
    }
    else error("find", "no query to find");
  }
}
