const mongoose = require("mongoose");
const { encryptData, decryptData, createSignature, verifySignature } = require("./encryption");
const { matchKeys } = require("./helpers");
const { getConnect } = require("./connection");
const PersonDataStorageError = require("./PersonDataStorageError");

let _schema_secure;
let _schema_open; //TODOs maybe Set ?
let _model;
let _key;

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

module.exports.setKey = (key) => _key = key;

module.exports.getModel = () => _model;

module.exports.generateModel = (schema, modelName, schemaOptions) => {
  const newSchema = new mongoose.Schema({
    ...schema.obj,
    security: { type: String },
    signature: { type: Buffer }
  },{
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt"
    }, ...schemaOptions });
    
  _model = mongoose.model(modelName, newSchema);

  _schema_secure = { ...schema.obj.security };
  _schema_open = { ...schema.obj };
  delete _schema_open.security;
};

module.exports.insert = (data, opts) => {
  if (data){
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
      const resp = await instance.save(opts).catch(err => {
        throw new PersonDataStorageError(err);
      });

      resolve(resp._id);
    });
  }
  throw new PersonDataStorageError("data is undefined");
};

module.exports.update = async (id, data, opts) => {
  if (id && data){
    const [ object ] = await _model.find({ _id: id }).exec().catch(err => {
      throw new PersonDataStorageError(err);
    });

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
    else throw new PersonDataStorageError("verifySignature failed");
  }
  else throw new PersonDataStorageError("id || data is undefined");
};

module.exports.getDataByID = (id) => {
  return new Promise(async (resolve, reject) => {
    const [ object ] = await _model.find({ _id: id }).exec().catch(err => {
      throw new PersonDataStorageError(err);
    });

    if (!object) return resolve(null);

    if (verifySignature(objectVerifyForm(object), object.signature, _key)){
      const secData = decryptData(object.security, _key);
      let allData = { ...secData };
      keyValueOpenSchema(allData, object);
      resolve(allData);
    }
    else throw new PersonDataStorageError("verifySignature failed");
  });
};

module.exports.deleteById = (id) => {
  return new Promise(async (resolve, reject) => {
    const [ object ] = await _model.find({ _id: id }).exec().catch(err => {
      throw new PersonDataStorageError(err);
    });

    if (!object) return resolve({ });

    if (verifySignature(objectVerifyForm(object), object.signature, _key))
      resolve(_model.deleteOne({ _id: id }));
    else reject("verifySignature failed, record didn't delete");
  });
};