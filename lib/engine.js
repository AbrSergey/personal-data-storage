const { mongoose } = require("./connect");
const { encryptData, decryptData, createSignature, verifySignature, createIndexForEntireSearch } = require("./encryption");
const { setWIndexSettings, setWIndexKeys, AddAs, AddAd, Search, Delete } = require("./sseIndex");
const { matchKeys, generateOpenKeys, generateSecureKeys, generateValidationScheme, unique } = require("./helpers");
const PersonalDataStorageError = require("./PersonalDataStorageError");

let _validate_schema; //object
let _open_keys; //array of keys
let _secure_keys; //array of keys
let _model;
let _search = {}; // undefined || "entire" || "word" || "nosearch"

const checkSignature = async (obj) => {
  let objVerify = {
    _id: obj._id,
    createdBy: obj.createdBy,
    updatedBy: obj.updatedBy
  };
  Object.keys(_validate_schema).forEach(key => {
    if (obj[key]) objVerify[key] = obj[key]
  });

  if (!verifySignature(objVerify, obj.signature))
    throw new PersonalDataStorageError("Verify signature failed!");
}

const encryptSecureFields = (keys, data, initIv) => {
  let object = {};
  keys.forEach(key => {
    const iv = parseInt((initIv).toString().slice(0, 16), 16) + _secure_keys.indexOf(key);
    object[key] = data[key] ? encryptData(data[key], String(iv)) : undefined;
  });
  return object;
}

const decryptSecureFields = (data) => {
  let resObj = {};
  _secure_keys.forEach((key, index) => {
    const iv = parseInt((data._id).toString().slice(0, 16), 16) + index;
    resObj[key] = data[key] ? decryptData(data[key], String(iv)) : undefined;
  });
  return resObj;
};

const keyValueOpenSchema = (object) => {
  let openPart = {};
  _open_keys.forEach( key => openPart[key] = object[key] );
  return openPart;
}

const keyValueSecureSchema = (securePart, object) => {
  _secure_keys.forEach( key => securePart[key] = object[key] );
  return securePart;
}

const filterValue = (obj, key, value) => obj.find(v => v[key] === value);

const updateOpenData = (objectFromDb, newData) => {
  let resObject = {};
  _open_keys.forEach(key => {
    if (objectFromDb[key]) resObject[key] = objectFromDb[key];
  });
  _open_keys.forEach(key => {
    if (Object.keys(newData).includes(key)) resObject[key] = newData[key];
  });
  return resObject;
}

const createEIndex = async (object, data) => {
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

const updateWIndex = async (data, id, opts) => {
  const tmp = [];
  Object.keys(data).forEach(async key => {
    tmp.push(new Promise( async resolve => {
      if (_search[key] === "word"){
        let promises = [];
        unique(data[key].split(" ")).forEach(word => promises.push(AddAs(word, id, key, opts)));
        const arrAsId = await Promise.all(promises);
  
        let objAsId;
        arrAsId.map(obj => objAsId = {...objAsId, ...obj});
  
        await AddAd(id, objAsId, key, opts);
        resolve();
      } else resolve();
    }))
  });
  await Promise.all(tmp);
};

const deleteWIndex = async (fileId) => {
  let promises = [];
  Object.keys(_search).forEach(async key => {
    promises.push(new Promise(async resolve => {
      if (_search[key] === "word"){
        //??????????????
        await Delete(fileId, key);
        resolve();
      } else resolve();
    }))
  });
  await Promise.all(promises);
};

module.exports.getModel = () => _model;

module.exports.validateData = async (data) => {
  // const obj = new mongoose.model('model', _validate_schema)({ ...data });
  // return obj.validate();
  // return _validate_schema.validate({ ...data });
};

module.exports.setIndexSettings = async (schema, opts, secret) => {
  setWIndexKeys(secret)
  Object.keys(schema).forEach(key => {
    if (schema[key].security) {
      _search[key] = schema[key].search && (schema[key].search === "entire" || schema[key].search === "word") ? schema[key].search : "nosearch";
    }
  });

  let promises = [];
  Object.keys(_search).forEach(async key => {
    promises.push(new Promise(async resolve => {
      if (_search[key] === "word") await setWIndexSettings(key, opts);
      resolve();
    }));
  });

  await Promise.all(promises);
  return "Ok";
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
    const id = mongoose.Types.ObjectId(); //_id = iv
    let object = {
      _id: id,
      ...keyValueOpenSchema(data),
      ...encryptSecureFields(_secure_keys, data, id),
      createdBy: data._author || "PersonalDataStorage",
      updatedBy: data._author || "PersonalDataStorage"
    };

    object.signature = createSignature(object);

    //add eindex
    await createEIndex(object, data);
    await updateWIndex(data, id, opts);
    
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
    await checkSignature(object);

    let resObject = {
      _id: object._id,
      ...updateOpenData(object, data),
      ...encryptSecureFields(matchKeys(_secure_keys, data), data, object._id),
      createdBy: data._author || "PersonalDataStorage",
      updatedBy: data._author || "PersonalDataStorage"
    };

    resObject.signature = createSignature(resObject);
    opts.useFindAndModify = false;
    const resp = await _model.findOneAndUpdate({ _id: id }, resObject, opts).catch(err =>{
      throw new PersonalDataStorageError(err);
    });

    return resp._id;
  }
  else throw new PersonalDataStorageError("id || data is undefined");
};

module.exports.getDataByID = async (id) => {
  const [ object ] = await _model.find({ _id: id }).exec().catch(err => {
    throw new PersonalDataStorageError(err);
  });

  if (!object) throw new PersonalDataStorageError("Data in personalDataStorage not exists by this id!");
  await checkSignature(object);
  
  return {
    ...keyValueOpenSchema(object),
    ...decryptSecureFields(object),
    createdAt: object.createdAt,
    updatedAt: object.updatedAt
  };
};

module.exports.find = async (key, value) => {
  //search in open data
  if (_search[key] === undefined) {
    const objects = await _model.find({ [key]: value }).exec().catch(err => {
      throw new PersonalDataStorageError(err);
    });

    let result = [];
    objects.forEach(async object => {
      // if (!object) throw new PersonalDataStorageError(`Data in personalDataStorage not exists by ${key}`);
      await checkSignature(object);
      
      result.push({
        ...keyValueOpenSchema(object),
        ...decryptSecureFields(object),
        createdAt: object.createdAt,
        updatedAt: object.updatedAt
      });
    });

    return result;
  }
  else if (_search[key] === "entire"){
    let obj = {};
    obj[`${key}_eindex`] = await createIndexForEntireSearch(value)

    const objects = await _model.find(obj).exec().catch(err => {
      throw new PersonalDataStorageError(err);
    });

    let result = [];
    objects.forEach(async object => {
      // if (!object) throw new PersonalDataStorageError(`Data in personalDataStorage not exists by ${key}`);
      await checkSignature(object);

      result.push({
        id: object.id,
        ...keyValueOpenSchema(object),
        ...decryptSecureFields(object),
        createdAt: object.createdAt,
        updatedAt: object.updatedAt
      });
    });

    result.forEach((resObj, index) => {
      if (resObj[key] !== value) result.splice(index, 1);
    });

    return result;
  }
  else if (_search[key] === "word"){
    return await Search(value, key);
  }
};

module.exports.deleteById = async (id) => {
  const [ object ] = await _model.find({ _id: id }).exec().catch(err => {
    throw new PersonalDataStorageError(err);
  });

  if (!object) return {};
  await checkSignature(object);
  await deleteWIndex(id);

  return _model.deleteOne({ _id: id });
};