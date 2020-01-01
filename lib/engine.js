const { mongoose } = require("./connect");
const { encryptData, decryptData, createSignature, verifySignature } = require("./encryption");
const { matchKeys, generateOpenKeys, generateSecureKeys, generateValidationScheme } = require("./helpers");
const PersonalDataStorageError = require("./PersonalDataStorageError");

let _validate_schema; //object
let _open_keys; //array of keys
let _secure_keys; //array of keys
// let _schema_secure;
// let _schema_open; //TODOs maybe Set ?
let _model;
let _key;

function objectVerifyForm(obj){
  let objVerify = {};
  objVerify._id = obj._id;
  objVerify.security = obj.security;
  Object.keys(_schema_open).forEach( key => objVerify[key] = obj[key] );
  return objVerify;
}

function keyValueOpenSchema(openPart, object){
  _open_keys.forEach( key => openPart[key] = object[key] );
  return openPart;
}

function keyValueSecureSchema(securePart, object){
  _secure_keys.forEach( key => securePart[key] = object[key] );
  return securePart;
}

const filterValue = (obj, key, value) => obj.find(v => v[key] === value);

module.exports.setKey = (key) => _key = key;

module.exports.validateData = async (data) => {
  console.log("validation...");
  const obj = new mongoose.model('model', _validate_schema)({ ...data });
  return obj.validate();
};

module.exports.getModel = () => _model;

module.exports.generateModel = async (initSchema, modelName, schemaOptions) => {
  _validate_schema = await generateValidationScheme(initSchema);
  _open_keys = generateOpenKeys(initSchema);
  _secure_keys = generateSecureKeys(initSchema);

  let tmp_schema = {};
  _open_keys.forEach((item) => tmp_schema[item] = _validate_schema[item]); //add to schema open data
  _secure_keys.forEach((item) => tmp_schema[item] = { type: String }); //add to schema secure data

  const newSchema = new mongoose.Schema({
    ...tmp_schema,
    // security: { type: String },
    signature: { type: Buffer },
    createdBy: { type: String },
    updatedBy: { type: String }
  },{
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt"
    }, ...schemaOptions });
    
  _model = mongoose.model(modelName, newSchema);

  // _schema_secure = { ...schema.obj.security };
  // _schema_open = {
  //   ...schema.obj,
  //   createdBy: { type: String },
  //   updatedBy: { type: String }
  // };

  // delete _schema_open.security;
};

module.exports.insert = async (data, opts) => {
  if (data){
    let openPart = {};
    let securePart = {};
    openPart = keyValueOpenSchema(openPart, data);
    securePart = keyValueSecureSchema(securePart, data);

    let object = {
      ...openPart,
      // security: securePart,
      createdBy: data._author || "PersonalDataStorage",
      updatedBy: data._author || "PersonalDataStorage"
    };
    
    object._id = mongoose.Types.ObjectId(); //_id = iv
    console.log(object)

    // object.security.id = object._id;
    _secure_keys.forEach((key, index) => {
      const iv = parseInt((object._id).toString().slice(0, 12), 16) + index;
      object[key] = encryptData(data[key], _key, String(iv));
    });

    // object.security = encryptData(object.security, _key, String(object._id));
    object.signature = createSignature(object, _key);

    const instance = new _model(object);
    const resp = await instance.save(opts).catch(err => {
      throw new PersonalDataStorageError(err);
    });

    return resp._id;
  }
  throw new PersonalDataStorageError("Data is undefined");
};

module.exports.update = async (id, data, opts = {}) => {
  if (id && data){
    const [ object ] = await _model.find({ _id: id }).exec().catch(err => {
      throw new PersonalDataStorageError(err);
    });

    if (!object) throw new PersonalDataStorageError("Record in personalDataStorage does not exists!");

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
        security: securePart,
        updatedBy: data._author || "empty"
      };
      resObject.signature = createSignature(resObject, _key);

      opts.useFindAndModify = false;

      const resp = await _model.findOneAndUpdate({ _id: id }, resObject, opts).catch(err =>{
        throw new PersonalDataStorageError(err);
      });

      return resp._id;
    }
    else throw new PersonalDataStorageError("Verify signature failed!");
  }
  else throw new PersonalDataStorageError("id || data is undefined");
};

module.exports.getDataByID = async (id) => {
  const [ object ] = await _model.find({ _id: id }).exec().catch(err => {
    throw new PersonalDataStorageError(err);
  });

  if (!object) throw new PersonalDataStorageError("Data in personalDataStorage not exists by this id!");

  if (verifySignature(objectVerifyForm(object), object.signature, _key)){
    const secData = decryptData(object.security, _key);
    let allData = { ...secData };
    keyValueOpenSchema(allData, object);

    allData.createdAt = object.createdAt;
    allData.updatedAt = object.updatedAt;
    
    return allData;
  }
  else throw new PersonalDataStorageError("VerifySignature failed");
};

module.exports.findOneByKeyInNonSecureData = async (key, value) => {
  let obj = {};
  obj[key] = value;

  const [ object ] = await _model.find(obj).exec().catch(err => {
    throw new PersonalDataStorageError(err);
  });

  if (!object) throw new PersonalDataStorageError(`Data in personalDataStorage not exists by ${key}`);

  if (verifySignature(objectVerifyForm(object), object.signature, _key)){
    const secData = decryptData(object.security, _key);
    let allData = { ...secData };
    keyValueOpenSchema(allData, object);

    allData.createdAt = object.createdAt;
    allData.updatedAt = object.updatedAt;
    
    return allData;
  }
  else throw new PersonalDataStorageError("VerifySignature failed");
};

module.exports.deleteById = async (id) => {
  const [ object ] = await _model.find({ _id: id }).exec().catch(err => {
    throw new PersonalDataStorageError(err);
  });

  if (!object) return {};

  if (verifySignature(objectVerifyForm(object), object.signature, _key))
    return _model.deleteOne({ _id: id });
  else throw new PersonalDataStorageError("VerifySignature failed, record didn't delete");
};