const mongoose = require("mongoose");
const crypto = require("crypto");
const { encryptData, decryptData } = require("./encryption");
const { connect, getConnect } = require("./connection");
const { copy } = require("./helpers");
const ObjectId = require('mongoose').Types.ObjectId;

let _schema;
let _model;
let _algorithm = "aes-256-cbc";
let _password = "32345678912345678912345678912345";
let _salt = "salt";
let _keyLen = 32;
let _ivLen = 16;

exports.db = {
  connect: (url, schema, modelName) => {
    return new Promise(async (resolve, reject) => {

      const newSchema = new mongoose.Schema({
        ...schema.obj,
        security: { type: String },
        iv: { type: Buffer }
      });

      _schema = { ...schema.obj }
      delete _schema.security

      _model = mongoose.model(modelName, newSchema);
      resolve( await connect(url) );
    });
  },

  // close: () => {
  //   try {
  //     mongoose.connection.close();
  //     _connected = false;
  //   } catch (err) {
  //     _connected = true;
  //     throw new Error ("cannot close connection");
  //   }
  // },

  isConnected: () => {
    return getConnect();
  },

  insert: (data) => {
    return new Promise(async (resolve, reject) => {
      if (!getConnect()) return reject("Error: please connect first to a database with 'module'.connect(url, schema, modelName)");
      if (!data) return reject("Error: no data to save.");
      if (!data.security) console.log("Warning: data.security is undefined");

      let object = copy(data);  // must be clone of this object
      object._id = mongoose.Types.ObjectId(); // create ObjectId
      object.security.id = object._id;  // add id to encryption database
      [ object.security, object.iv ] = encryptData(object.security, _algorithm, _password, _salt, _keyLen, _ivLen); // encryption it

      // add HMAC

      let instance = new _model(object);
      resolve(await instance.save());
    });
  },

  find: (id) => {
    return new Promise(async (resolve, reject) => {
      if (!getConnect()) return reject("Error: please connect first to a database with 'module'.connect(url, schema, modelName)");
      if (!id) return reject("Error: no query to find");
      if (!ObjectId.isValid(id)) return reject("Error: id is not ObjectId");

      let [ object ] = await _model.find({ _id: id }).exec();

      if (!object) resolve({ });

      const secData = decryptData(object.security, object.iv, _algorithm, _password, _salt, _keyLen);

      let allData = { ...secData};
      Object.keys(_schema).forEach( key => allData[key] = object[key] );

      resolve(allData);
    });
  }
}
