const mongoose = require("mongoose");
const crypto = require("crypto");
const ObjectId = require('mongoose').Types.ObjectId;

let _connected = false;
let _schema;
let _model;
let _algorithm = "aes-256-cbc";
let _password = "32345678912345678912345678912345";
let _salt = "salt";
let _keyLen = 32;
let _ivLen = 16;

function copy(o) {
  let output, v, key;
  output = Array.isArray(o) ? [] : {};
  for (key in o) {
    v = o[key];
    output[key] = (typeof v === "object") ? copy(v) : v;
  }
  return output;
};

function encryptData(plaintext){
  try {
    const key = crypto.scryptSync(_password, _salt, _keyLen); //async ???
    const iv = crypto.randomBytes(_ivLen);
    const cipher = crypto.createCipheriv(_algorithm, key, iv);

    let ciphertext = cipher.update(JSON.stringify(plaintext), "utf8", "hex");
    ciphertext += cipher.final("hex");

    return [ ciphertext, iv ];
  } catch (err) {
    return new Error ("Error while encrypting: " + err);
  }
}

function decryptData(ciphertext, iv){
  try {
    const key = crypto.scryptSync(_password, _salt, _keyLen);
    const decipher = crypto.createDecipheriv(_algorithm, key, iv);

    let plaintext = decipher.update(ciphertext, "hex", "utf8");
    plaintext += decipher.final("utf8");

    return JSON.parse(plaintext);
  } catch (err) {
    return new Error ("Error while dencrypting: " + err);
  }
}

mongoose.connection.on("connected", function () {
  console.log("Connected to MongoDb!");
  _connected = true;
});

mongoose.connection.on("error", function (err) {
  console.log(`MongoError: ${err}`);
});

mongoose.connection.on("disconnected", function () {
  console.log("Mongo disconnected");
  _connected = false;
});

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
      resolve( await mongoose.connect(url, { useNewUrlParser: true, poolSize: 4 }) );
    });
  },

  close: () => {
    try {
      mongoose.connection.close();
      _connected = false;
    } catch (err) {
      _connected = true;
      throw new Error ("cannot close connection");
    }
  },

  isConnected: () => {
    return _connected;
  },

  insert: (data) => {
    return new Promise(async (resolve, reject) => {
      if (!_connected) return reject("Error: please connect first to a database with 'module'.connect(url, schema, modelName)");
      if (!data) return reject("Error: no data to save.");
      if (!data.security) console.log("Warning: data.security is undefined");

      let object = copy(data);  // must be clone of this object
      object._id = mongoose.Types.ObjectId(); // create ObjectId
      object.security.id = object._id;  // add id to encryption database
      [ object.security, object.iv ] = encryptData(object.security); // encryption it

      // add HMAC

      let instance = new _model(object);
      resolve(await instance.save());
    });
  },

  find: (id) => {
    return new Promise(async (resolve, reject) => {
      if (!_connected) return reject("Error: please connect first to a database with 'module'.connect(url, schema, modelName)");
      if (!id) return reject("Error: no query to find");
      if (!ObjectId.isValid(id)) return reject("Error: id is not ObjectId");

      let [ object ] = await _model.find({ _id: id }).exec();

      const secData = decryptData(object.security, object.iv);
      console.log();

      let allData = { ...secData};
      Object.keys(_schema).forEach( key => allData[key] = object[key] );

      resolve(allData);
    });
  }
}
