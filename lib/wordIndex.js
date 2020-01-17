const { mongoose } = require("./connect");
const { encryptData, decryptData, createSignature, verifySignature, createIndexForEntireSearch } = require("./encryption");
const PersonalDataStorageError = require("./PersonalDataStorageError");
const ObjectId = require("mongoose").Types.ObjectId;

let _indexTModel;
let _indexAModel;
let _word_index_id = {};
let _opts;

module.exports.setWIndexSettings = async (key, opts) => {
  const indexASchema = new mongoose.Schema({
    t: mongoose.Mixed,
    file: mongoose.Schema.Types.ObjectId,
    next: mongoose.Mixed,
    addrDn: mongoose.Mixed,
    addrD_plus: mongoose.Mixed,
    addrNd_minus: mongoose.Mixed,
    addrNd_plus: mongoose.Mixed,
    addrN: mongoose.Mixed,
    addrN_minus: mongoose.Mixed,
    addrN_plus: mongoose.Mixed,
    word: mongoose.Mixed,
  }, { strict: false });
  const indexTSchema = new mongoose.Schema({
    _index: mongoose.Mixed,
    s: Object,
    d: Object
   }, { strict: false });
  _indexAModel = mongoose.model("indexA", indexASchema);
  _indexTModel = mongoose.model("indexT", indexTSchema);
  const indexT = await _indexTModel.find({ _index: key }).exec().catch(err => {
    throw new PersonalDataStorageError(err);
  });

  if (!indexT.length) {
    _word_index_id[key] = mongoose.Types.ObjectId();
    const instance = new _indexTModel({
      _id: _word_index_id[key],
      _index: key,
      Ts: {}
    });

    await instance.save(opts).catch(err => {
      throw new PersonalDataStorageError(err);
    });
  } else {
    if (indexT.length !== 1) throw new PersonalDataStorageError(`Find more than 1 index for ${key}`);
    _word_index_id[key] = indexT[0]._id;
  }
};

const findAsIndex = async ({ _id }) => {
  const As = await _indexAModel.find({ _id });
  const t = JSON.parse(As[0].t);
  return {
    _id: As[0]._id,
    file: t[0],
    addrDn: t[1],
    next: t[2]
  };
};

const createAsIndex = async ({ _id, file, addrDn, next }) => {
  const instance = new _indexAModel({
    _id: _id || mongoose.Types.ObjectId(),
    t: JSON.stringify([file || 0, addrDn || 0, next || 0])
  });
  const As = await instance.save().catch(err => {
    throw new PersonalDataStorageError(err);
  });
  return { _id: As._id };
};

const updateAsIndex = async ({ _id, file, addrDn, next }) => {
  As = await _indexAModel.findOneAndUpdate({ _id }, {
    t: JSON.stringify([file || 0, addrDn || 0, next || 0])
  }).catch(err =>{
    throw new PersonalDataStorageError(err);
  });
  return {
    _id: As._id,
    addrDn: As.addrDn
  };
};

const findAndUpdateAsIndex = async ({ _id, file, addrDn, next }) => {
  const As = await findAsIndex({ _id });
  if (file !== undefined) As.file = file;
  if (addrDn !== undefined) As.addrDn = addrDn;
  if (next !== undefined )As.next = next;
  return await updateAsIndex(As);
};

const findAdIndex = async ({ _id }) => {
  const Ad = await _indexAModel.find({ _id });
  // console.log("_id")
  // console.log(_id)
  // console.log(Ad)
  const t = JSON.parse(Ad[0].t);
  return {
    _id: Ad[0]._id,
    addrD_plus: t[0],
    addrNd_minus: t[1],
    addrNd_plus: t[2],
    addrN: t[3],
    addrN_minus: t[4],
    addrN_plus: t[5],
    word: t[6]
  };
};

const updateAdIndex = async ({ _id, addrD_plus, addrNd_minus, addrNd_plus, addrN, addrN_minus, addrN_plus, word }) => {
  As = await _indexAModel.findOneAndUpdate({ _id }, {
    t: JSON.stringify([ addrD_plus||0, addrNd_minus||0, addrNd_plus||0, addrN||0, addrN_minus||0, addrN_plus||0, word||0 ])
  }).catch(err =>{
    throw new PersonalDataStorageError(err);
  });
  return {
    _id: As._id,
    addrDn: As.addrDn
  };
};

const findAndUpdateAdIndex = async ({ _id, addrD_plus, addrNd_minus, addrNd_plus, addrN, addrN_minus, addrN_plus, word }) => {
  const Ad = await findAdIndex({ _id });
  if (addrD_plus !== undefined) Ad.addrD_plus = addrD_plus;
  if (addrNd_minus !== undefined) Ad.addrNd_minus = addrNd_minus;
  if (addrNd_plus !== undefined )Ad.addrNd_plus = addrNd_plus;
  if (addrN !== undefined )Ad.addrN = addrN;
  if (addrN_minus !== undefined )Ad.addrN_minus = addrN_minus;
  if (addrN_plus !== undefined )Ad.addrN_plus = addrN_plus;
  if (word !== undefined )Ad.word = word;
  return await updateAdIndex(Ad);
};

const findOneAndRemoveAdIndex = async ({ _id }) => {
  const Ad = await _indexAModel.findOneAndRemove({ _id }).catch(err =>{
    throw new PersonalDataStorageError(err);
  });

  const t = JSON.parse(Ad.t);
  return {
    _id: Ad._id,
    addrD_plus: t[0],
    addrNd_minus: t[1],
    addrNd_plus: t[2],
    addrN: t[3],
    addrN_minus: t[4],
    addrN_plus: t[5],
    word: t[6]
  };
};



module.exports.AddWord = async (word, file_id, key, opts) => {
  _opts = opts;
  let arrAsId = [];
  const Dn_id = mongoose.Types.ObjectId();
  //проверить существует ли это слово в Ts
  // console.log(word)
  const Fk1_word = createSignature(word).toString("base64");
  const record_in_Ts = `s.${Fk1_word}`;
  let [ Ts ] = await _indexTModel.aggregate([
    { $match: { _id: _word_index_id[key], [record_in_Ts]: { $exists: true } } },
    { $project: { [record_in_Ts]: 1 } }
  ]);
  
  let As;

  //если слово не существует то добавляю запсь в коллекцию indexAs
  if (!Ts){
    As = await createAsIndex({
      file: file_id,
      addrDn: Dn_id,
      next: 0
    });

    //добавляю запись в Ts
    Ts = await _indexTModel.findOneAndUpdate({ _id: _word_index_id[key] }, {
      $set: { [record_in_Ts]: As._id }
    } , opts).catch(err =>{
      throw new PersonalDataStorageError(err);
    });

    arrAsId.push(As._id);

    return { [word]: {
      Ad_id: Dn_id,
      arrAs: arrAsId,
      As_minus : 0
    } };
  }
  else {
    // console.log("1")
    // console.log(word)
    // console.log(Ts.s[Fk1_word])

    As = await findAsIndex({ _id: Ts.s[Fk1_word] });
    arrAsId.push(As._id);


    // console.log("2")
    //find latest record in As
    while (As.next !== 0){
      As = await findAsIndex({ _id: As.next });
      arrAsId.push(As._id);
    }

    const id = mongoose.Types.ObjectId();
    arrAsId.push(id);

    await createAsIndex({
      _id: id,
      file: file_id,
      addrDn: Dn_id,
      next: 0
    });

    await findAndUpdateAsIndex({
      _id: As._id,
      next: id
    });

    return { [word]: {
      Ad_id: Dn_id,
      arrAs: arrAsId,
      As_minus: As.addrDn
    }};
  }
};



//создание и обновление индексов для удаления
module.exports.AddFile = async (fileId, objAsId, key, opts) => {
  fileId = String(fileId);
  //создать Ad
  const arrayAdId = Object.keys(objAsId).map(key => objAsId[key].Ad_id);
  const As_minus_arr = Object.keys(objAsId).map(key => objAsId[key].As_minus);
  Object.keys(objAsId).map(key => {
    objAsId[key] = objAsId[key].arrAs
  });

  await Promise.all(Object.keys(objAsId).map(async (word, index) => {

    if (As_minus_arr[index])
      return findAndUpdateAdIndex({
      _id: ObjectId(As_minus_arr[index]),
      addrNd_plus: arrayAdId[index],
      addrN_plus: objAsId[word][objAsId[word].length - 1]
      })
    // return _indexAModel.findOneAndUpdate({ _id: mongoose.Types.ObjectId(As_minus_arr[index]) }, {
    //   addrNd_plus: arrayAdId[index],
    //   addrN_plus: objAsId[word][objAsId[word].length - 1]
    // } , opts).catch(err =>{
    //   throw new PersonalDataStorageError(err);
    // });
  }));

  const res = await Object.keys(objAsId).map((word, index) => {
    const obj = {
      addrD_plus: Object.keys(objAsId).length - 1 > index ? arrayAdId[index + 1] : 0,
      addrNd_minus: As_minus_arr[index],
      addrNd_plus: 0,
      addrN: objAsId[word][objAsId[word].length - 1],
      addrN_minus: objAsId[word].length > 1 ? objAsId[word][objAsId[word].length - 2] : 0,
      addrN_plus: 0,
      word: createSignature(word).toString("base64")
    };
    return {
      _id: arrayAdId[index],
      t: JSON.stringify([ obj.addrD_plus, obj.addrNd_minus, obj.addrNd_plus, obj.addrN, obj.addrN_minus, obj.addrN_plus, obj.word ])
    }
  });

  await _indexAModel.insertMany(res).catch(err => {
    throw new PersonalDataStorageError(err);
  });

  //создать Td
  const Fk1_file = createSignature(fileId).toString("base64");
  const record_in_Ts = `d.${Fk1_file}`;

  Ts = await _indexTModel.findOneAndUpdate({ _id: _word_index_id[key] }, {
    $set: { [record_in_Ts]: arrayAdId[0] }
  } , opts).catch(err =>{
    throw new PersonalDataStorageError(err);
  });
};

module.exports.Search = async (word, key, opts) => {
  //найти запись в Ts
  const Fk1_word = createSignature(word).toString("base64");
  const record_in_Ts = `s.${Fk1_word}`;
  let [ Ts ] = await _indexTModel.aggregate([
    { $match: { _id: _word_index_id[key], [record_in_Ts]: { $exists: true } } },
    { $project: { [record_in_Ts]: 1 } }
  ]);

  if(!Ts) return null;

  let arrId = []
  //если есть, то найти первый элемент в As
  let As = await findAsIndex({ _id: Ts.s[Fk1_word] });
  arrId.push(As.file);

  //найти все элементы пока (next !== 0)
  while(As.next !== 0){
    // console.log(As)
    As = await findAsIndex({ _id: As.next });
    arrId.push(As.file);
  }

  return arrId;
};

module.exports.Delete = async (fileId, key) => {
  fileId = String(fileId);

  //вычислить хэш от id file
  const Fk1_file = createSignature(fileId).toString("base64");
  const record_in_Td = `d.${Fk1_file}`;

  const Td = await _indexTModel.findOneAndUpdate( //TODO вернуть только нужные значение!!!!
    { _id: _word_index_id[key] },
    { $unset: { [record_in_Td]: 1 }},
    { projection: { [record_in_Td]: 1 }}
  ).catch(err =>{
    throw new PersonalDataStorageError(err);
  });

  let Ad_addr = Td.d[Fk1_file];
  // console.log("Ad_addr");
  // console.log(Ad_addr);

  
  while (Ad_addr){
    // let bulkAModel = _indexAModel.collection.initializeUnorderedBulkOp();
    let bulkTModel = _indexTModel.collection.initializeUnorderedBulkOp();

    //найти и удалить запись из Ad
    // let Ad = await _indexAModel.findOneAndRemove({ _id: Ad_addr }).catch(err =>{
    //   throw new PersonalDataStorageError(err);
    // });
    let Ad = await findOneAndRemoveAdIndex({ _id: Ad_addr });
    // console.log(Ad)
    // console.log("Agter findandremove")

    //обновить Nd_plus и N+1 в индексе Ad по адресу Nd_minus на Nd_plus и N+1
    if (Ad.addrNd_minus){
      // await _indexAModel.find({ _id: Ad.addrNd_minus }).updateOne({
      //   $set: {
      //     addrNd_plus: Ad.addrNd_plus,
      //     addrN_plus: Ad.addrN_plus
      //   }
      // });

      await findAndUpdateAdIndex({
        _id: Ad.addrNd_minus,
        addrNd_plus: Ad.addrNd_plus,
        addrN_plus: Ad.addrN_plus
      });
    }

    //обновить Nd_minus и N-1 в индексе Ad по адресу Nd_plus на Nd_minus и N-1
    if (Ad.addrNd_plus){
      // await _indexAModel.find({ _id: Ad.addrNd_plus }).updateOne({
      //   $set: {
      //     addrNd_minus: Ad.addrNd_minus,
      //     addrN_minus: Ad.addrN_minus
      //   }
      // });

      await findAndUpdateAdIndex({
        _id: Ad.addrNd_plus,
        addrNd_minus: Ad.addrNd_minus,
        addrN_minus: Ad.addrN_minus
      });
    }

    //обновить next в As по адресу N_1 на N+1
    if (Ad.addrN_minus){

      await findAndUpdateAsIndex({
        _id: Ad.addrN_minus,
        next: Ad.addrN_plus
      });
  
    }

    //если это первый элемент, то есть N_minus равен нулю, а N_plus не нуль, то исправить указатель в Ts на N_plus
    if (!Ad.addrN_minus && Ad.addrN_plus){
      // console.log("change ->                 --------")
      const tmp = `s.${Ad.word}`;

      bulkTModel.find({ _id: _word_index_id[key] }).updateOne({
        $set: {
          [tmp]:  Ad.addrN_plus
        }
      });
    }
      
    if (!Ad.addrN_minus && !Ad.addrN_plus){
      const tmp = `s.${Ad.word}`;
      // console.log("delete ->                 --------")
      bulkTModel.find({ _id: _word_index_id[key] }).updateOne({
        $unset: { [tmp]: 1 }
      });
    }


    let promises = []

    // if(bulkAModel && bulkAModel.s && bulkAModel.s.currentBatch && bulkAModel.s.currentBatch.operations 
    //   && bulkAModel.s.currentBatch.operations.length > 0) promises.push(bulkAModel.execute());
    
    if(bulkTModel && bulkTModel.s && bulkTModel.s.currentBatch && bulkTModel.s.currentBatch.operations 
      && bulkTModel.s.currentBatch.operations.length > 0) promises.push(bulkTModel.execute());


    //удалить запись в As по адресу N
    // console.log("before remove latest")
    // console.log(Ad)
    // console.log(Ad.addrN)
    promises.push(_indexAModel.deleteOne({ _id: Ad.addrN }));
    await Promise.all(promises);

    //переходим к следующему слову в удаляемом файле
    Ad_addr = Ad.addrD_plus;
  }
};