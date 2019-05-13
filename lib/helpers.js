const mongoose = require("mongoose");
const crypto = require("crypto");
const ObjectId = require('mongoose').Types.ObjectId;

let _connected = false;
let _model;
let _algorithm = "aes-256-cbc";
let _key = "32345678912345678912345678912345";

function copy(o) {
  let output, v, key;
  output = Array.isArray(o) ? [] : {};
  for (key in o) {
    v = o[key];
    output[key] = (typeof v === "object") ? copy(v) : v;
  }
  return output;
};

function encryptData(value){
  try {
    let cipher = crypto.createCipher(_algorithm, _key); // TODOs createCipheriv ???
    let encrypted = cipher.update(JSON.stringify(value), "utf8", "hex");
    encrypted += cipher.final("hex");

    return encrypted;
  } catch (err) {
    return new Error ("Error while encrypting: " + err);
  }
}

function decryptData(value){
  try {
      let decipher = crypto.createDecipher(_algorithm, _key)
      let dec = decipher.update(value.toString(), "hex", "utf8")
      dec += decipher.final("utf8");

      return JSON.parse(dec);
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
          encryption: { type: String }
      });

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

  insert: (info) => {
    return new Promise(async (resolve, reject) => {
      if (!_connected) return reject("Error: please connect first to a database with 'module'.connect(url, schema, modelName)");
      if (!info) return reject("Error: no data to save.");
      if (!info.encryption) console.log("Warning: info.encryption is undefined");

      let object = copy(info);  // must be clone of this object
      object._id = mongoose.Types.ObjectId(); // create ObjectId
      object.encryption.id = object._id;  // add id to encryption database

      // add hash of this data
      // encryption it
      object.encryption = encryptData(object.encryption);

      let instance = new _model(object);
      resolve(await instance.save());
    });
  },

  find: (id) => {
    return new Promise(async (resolve, reject) => {
      if (!_connected) return reject("Error: please connect first to a database with 'module'.connect(url, schema, modelName)");
      if (!id) return reject("Error: no query to find");
      if (!ObjectId.isValid(id)) return reject("Error: id is not ObjectId");

      const [ object ] = await _model.find({_id: id}).exec();

      const text = decryptData(object.encryption);
      console.log("Inside find function:");
      console.log(text);
    });
  }
}

// update(query){
//   return new Promise((resolve, reject) => {
//     if (!this.id) return reject("Error: record not created!");
//
//     this.mongoModel.findByIdAndUpdate({ _id: this.id }, query, (err, result) => {
//       if (err) reject(err);
//       resolve(result);
//     });
//   });
// }
//
// erase(){
//   return new Promise((resolve, reject) => {
//     if (!this.id) return reject("Error: record not created!");
//
//     this.mongoModel.findByIdAndRemove({_id: this.id}, (err, result) => {
//       if (err) return reject(err);
//       this.erased = true;
//       resolve(result);
//     });
//   });
// }
//
// wasErased(){
//   return this.erased;
// }
