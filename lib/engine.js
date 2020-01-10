const { mongoose } = require("./connect");
const { encryptData, decryptData, createSignature, verifySignature, createIndexForEntireSearch } = require("./encryption");
const { matchKeys, generateOpenKeys, generateSecureKeys, generateValidationScheme } = require("./helpers");
const PersonalDataStorageError = require("./PersonalDataStorageError");

let _validate_schema; //object
let _open_keys; //array of keys
let _secure_keys; //array of keys
let _model;
let _key;
let _search = {}; // undefined || "entire" || "word" || "nosearch"

function objectVerifyForm(obj){
  let objVerify = {
    _id: obj._id,
    createdBy: obj.createdBy,
    updatedBy: obj.updatedBy
  };
  Object.keys(_validate_schema).forEach(key => {
    if (obj[key]) objVerify[key] = obj[key]
  });
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

const updateOpenData = (resObject, objectFromDb, newData) => {
  _open_keys.forEach(key => {
    if (objectFromDb[key]) resObject[key] = objectFromDb[key];
  });
  _open_keys.forEach(key => {
    if (Object.keys(newData).includes(key)) resObject[key] = newData[key];
  });
  return resObject;
}

const creatEindex = async (object, data) => {
  let promises = [];

  Object.keys(_search).forEach(async key => {
    promises.push(new Promise (async (resolve) => {
      if (_search[key] === "entire"){
        promises.push(object[`${key}_eindex`] = await createIndexForEntireSearch(data[key]));
        resolve();
      } else resolve();
    }));
  });

  return await Promise.all(promises);
};

module.exports.setKey = (key) => _key = key;

module.exports.validateData = async (data) => {
  const obj = new mongoose.model('model', _validate_schema)({ ...data });
  return obj.validate();
};

module.exports.getModel = () => _model;

module.exports.setSearchSettings = (schema) => {
  Object.keys(schema).forEach(key => {
    if (schema[key].security) {
      _search[key] = schema[key].search && (schema[key].search === "entire" || schema[key].search === "word") ? schema[key].search : "nosearch";
    }
  });
};

module.exports.generateModel = async (initSchema, modelName, schemaOptions) => {
  _validate_schema = await generateValidationScheme(initSchema);
  _open_keys = generateOpenKeys(initSchema);
  _secure_keys = generateSecureKeys(initSchema);

  let tmp_schema = {};
  _open_keys.forEach((item) => tmp_schema[item] = _validate_schema[item]); //add to schema open data
  _secure_keys.forEach((item) => tmp_schema[item] = { type: String }); //add to schema secure data


  //add index field for entire search
  _secure_keys.forEach((item) => {
    if (initSchema[item].search === "entire"){
      tmp_schema[`${item}_eindex`] = {
        type: Buffer,
        required: true
      };
    };
  });

  const newSchema = new mongoose.Schema({
    ...tmp_schema,
    signature: { type: Buffer },
    createdBy: { type: String },
    updatedBy: { type: String }
  },{
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt"
    }, ...schemaOptions });
    
  _model = mongoose.model(modelName, newSchema);
};

module.exports.insert = async (data, opts) => {
  if (data){
    let openPart = {};
    keyValueOpenSchema(openPart, data);

    let object = {
      ...openPart,
      createdBy: data._author || "PersonalDataStorage",
      updatedBy: data._author || "PersonalDataStorage"
    };
    
    object._id = mongoose.Types.ObjectId(); //_id = iv

    _secure_keys.forEach((key, index) => {
      const iv = parseInt((object._id).toString().slice(0, 16), 16) + index;
      object[key] = encryptData(data[key], _key, String(iv));
    });

    object.signature = createSignature(object, _key);

    //add data to eindex
    await creatEindex(object, data);

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
      openPart = updateOpenData(openPart, object, data);

      let resObject = {
        ...openPart,
        _id: object._id,
        createdBy: data._author || "PersonalDataStorage",
        updatedBy: data._author || "PersonalDataStorage"
      };

      //update secure keys
      const secureKeys = matchKeys(_secure_keys, data);
      secureKeys.forEach(secureKey =>{
        const iv = parseInt((object._id).toString().slice(0, 16), 16) + _secure_keys.indexOf(secureKey);
        resObject[secureKey] = encryptData(data[secureKey], _key, String(iv));
      })

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
    // const secData = decryptData(object.security, _key);
    let allData = {};
    keyValueOpenSchema(allData, object);

    //fetch secure data
    _secure_keys.forEach(secureKey => {
      const iv = parseInt((object._id).toString().slice(0, 16), 16) + _secure_keys.indexOf(secureKey);
      allData[secureKey] = decryptData(object[secureKey], _key, String(iv));
    });

    allData.createdAt = object.createdAt;
    allData.updatedAt = object.updatedAt;
    
    return allData;
  }
  else throw new PersonalDataStorageError("VerifySignature failed");
};

module.exports.find = async (key, value) => {
  if (_search[key] === undefined) {
    const objects = await _model.find({ key: value }).exec().catch(err => {
      throw new PersonalDataStorageError(err);
    });

    let result = [];
    objects.forEach(object => {
      if (!object) throw new PersonalDataStorageError(`Data in personalDataStorage not exists by ${key}`);

      if (verifySignature(objectVerifyForm(object), object.signature, _key)){
        // const secData = decryptData(object.security, _key);
        let allData = {};
        keyValueOpenSchema(allData, object);
    
        // fetch secure data
        _secure_keys.forEach(secureKey => {
          const iv = parseInt((object._id).toString().slice(0, 16), 16) + _secure_keys.indexOf(secureKey);
          allData[secureKey] = decryptData(object[secureKey], _key, String(iv));
        });
    
        allData.createdAt = object.createdAt;
        allData.updatedAt = object.updatedAt;
        
        result.push(allData);
      }
      else throw new PersonalDataStorageError("VerifySignature failed");
    });

    return result;
  }
  else if (_search[key] === "entire") {
    let obj = {};
    obj[`${key}_eindex`] = await createIndexForEntireSearch(value)

    const objects = await _model.find(obj).exec().catch(err => {
      throw new PersonalDataStorageError(err);
    });

    let result = [];
    objects.forEach(object => {
      if (!object) throw new PersonalDataStorageError(`Data in personalDataStorage not exists by ${key}`);

      if (verifySignature(objectVerifyForm(object), object.signature, _key)){
        // const secData = decryptData(object.security, _key);
        let allData = {};
        keyValueOpenSchema(allData, object);
    
        // fetch secure data
        _secure_keys.forEach(secureKey => {
          const iv = parseInt((object._id).toString().slice(0, 16), 16) + _secure_keys.indexOf(secureKey);
          allData[secureKey] = decryptData(object[secureKey], _key, String(iv));
        });
    
        allData.createdAt = object.createdAt;
        allData.updatedAt = object.updatedAt;
        
        result.push(allData);
      }
      else throw new PersonalDataStorageError("VerifySignature failed");
    });

    result.forEach((resObj, index) => {
      if (resObj[key] !== value) result.splice(index, 1);
    });

    return result;
  }
};

// module.exports.findOneByKeyInNonSecureData = async (key, value) => {
//   let obj = {};
//   obj[key] = value;

//   const [ object ] = await _model.find(obj).exec().catch(err => {
//     throw new PersonalDataStorageError(err);
//   });

//   if (!object) throw new PersonalDataStorageError(`Data in personalDataStorage not exists by ${key}`);

//   if (verifySignature(objectVerifyForm(object), object.signature, _key)){
//     const secData = decryptData(object.security, _key);
//     let allData = { ...secData };
//     keyValueOpenSchema(allData, object);

//     allData.createdAt = object.createdAt;
//     allData.updatedAt = object.updatedAt;
    
//     return allData;
//   }
//   else throw new PersonalDataStorageError("VerifySignature failed");
// };

module.exports.deleteById = async (id) => {
  const [ object ] = await _model.find({ _id: id }).exec().catch(err => {
    throw new PersonalDataStorageError(err);
  });

  if (!object) return {};

  if (verifySignature(objectVerifyForm(object), object.signature, _key))
    return _model.deleteOne({ _id: id });
  else throw new PersonalDataStorageError("VerifySignature failed, record didn't delete");
};