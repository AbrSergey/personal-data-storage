const { mongoose } = require("./connect");
const { generateKey, H1, H2, F, G, P } = require("./encryption");
const PersonalDataStorageError = require("./PersonalDataStorageError");
const { xor } = require("./helpers");
const ObjectId = require("mongoose").Types.ObjectId;

let _indexTModel;
let _indexAModel;
let _word_index_id = {};
let _opts;
let _key1;
let _key2;
let _key3;
let _null = "0".repeat(24);

const findAsIndex = async ({ _id }, dataForXor) => {
  const As = await _indexAModel.find({ _id });
  if (!dataForXor) {
    return As[0].t;
  }
  const t = JSON.parse(xor(As[0].t, dataForXor));
  return {
    _id: As[0]._id,
    file: t[0] !== _null ? t[0] : 0,
    addrDn: t[1] !== _null ? t[1] : 0,
    next: t[2] !== _null ? t[2] : 0
  };
};

const createAsIndex = async ({ _id, file, addrDn, next }, dataForXor) => {
  const instance = new _indexAModel({
    _id: _id || mongoose.Types.ObjectId(),
    t: xor(JSON.stringify([file || _null, addrDn || _null, next || _null]), dataForXor)
  });
  const As = await instance.save().catch(err => {
    throw new PersonalDataStorageError(err);
  });
  return { _id: As._id };
};

const updateAsIndex = async ({ _id, file, addrDn, next }, dataForXor) => {
  As = await _indexAModel.findOneAndUpdate({ _id }, {
    t: xor(JSON.stringify([file || _null, addrDn || _null, next || _null]), dataForXor)
  }).catch(err =>{
    throw new PersonalDataStorageError(err);
  });
  return {
    _id: As._id,
    addrDn: As.addrDn !== _null ? As.addrDn : 0
  };
};

const findAndUpdateAsIndex = async ({ _id, file, addrDn, next }, dataForXor, update) => {
  let As = await findAsIndex({ _id }, dataForXor);
  if (!dataForXor){
    As = await _indexAModel.findOneAndUpdate({ _id }, {
      t: xor(As, update)
    }).catch(err => {
      throw new PersonalDataStorageError(err);
    });
    return;
  }
  if (file !== undefined) As.file = file;
  if (addrDn !== undefined) As.addrDn = addrDn;
  if (next !== undefined )As.next = next;
  return await updateAsIndex(As, dataForXor);
};

const findAdIndex = async ({ _id }, dataForXor) => {
  const Ad = await _indexAModel.find({ _id });
  if (!dataForXor) {
    return Ad[0].t;
  }
  const t = JSON.parse(xor(Ad[0].t, H2(_key2)));
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

const updateAdIndex = async ({ _id, addrD_plus, addrNd_minus, addrNd_plus, addrN, addrN_minus, addrN_plus, word }, dataForXor) => {
  As = await _indexAModel.findOneAndUpdate({ _id }, {
    t: xor(JSON.stringify([ addrD_plus||_null, addrNd_minus||_null, addrNd_plus||_null, addrN||_null, addrN_minus||_null, addrN_plus||_null, word||_null ]), dataForXor)
  }).catch(err =>{
    throw new PersonalDataStorageError(err);
  });
  return {
    _id: As._id,
    addrDn: As.addrDn
  };
};

const findAndUpdateAdIndex = async ({ _id, addrD_plus, addrNd_minus, addrNd_plus, addrN, addrN_minus, addrN_plus, word }, dataForXor, update) => {
  const Ad = await findAdIndex({ _id }, dataForXor);
  if (!dataForXor){
    // console.log(String(Ad))

    s = await _indexAModel.findOneAndUpdate({ _id }, {
      t: xor(Ad, update)
    }).catch(err => {
      throw new PersonalDataStorageError(err);
    });
    return;
  }
  if (addrD_plus !== undefined) Ad.addrD_plus = addrD_plus;
  if (addrNd_minus !== undefined) Ad.addrNd_minus = addrNd_minus;
  if (addrNd_plus !== undefined )Ad.addrNd_plus = addrNd_plus;
  if (addrN !== undefined )Ad.addrN = addrN;
  if (addrN_minus !== undefined )Ad.addrN_minus = addrN_minus;
  if (addrN_plus !== undefined )Ad.addrN_plus = addrN_plus;
  if (word !== undefined )Ad.word = word;
  return await updateAdIndex(Ad, dataForXor);
};

const findOneAndRemoveAdIndex = async ({ _id }, dataForXor) => {
  const Ad = await _indexAModel.findOneAndRemove({ _id }).catch(err =>{
    throw new PersonalDataStorageError(err);
  });

  const t = JSON.parse(xor(String(Ad.t), dataForXor));
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

const generateDataForXorAs = (word) => H1(F(word, _key3))
const generateDataForXorAd = (file) => H2(P(file, _key3))

module.exports.setWIndexKeys = async (secret) => {
  _key1 = generateKey(secret, secret);
  _key2 = generateKey(_key1, secret);
  _key3 = generateKey(_key2, secret);
};

module.exports.setWIndexSettings = async (key, opts) => {
  const indexASchema = new mongoose.Schema({
    t: { type: Buffer }
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

module.exports.AddAs = async (word, file_id, key, opts) => {
  const dataForXor = generateDataForXorAs(word);
  _opts = opts;
  let arrAsId = [];
  const Dn_id = mongoose.Types.ObjectId();
  //проверить существует ли это слово в Ts
  const Fk1_word = F(word, _key1);


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
    }, dataForXor);


    //добавляю запись в Ts
    Ts = await _indexTModel.findOneAndUpdate({ _id: _word_index_id[key] }, {
      $set: { [record_in_Ts]: String(xor(String(As._id), G(word, _key2))) }
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


    As = await findAsIndex({ _id: String(xor(Ts.s[Fk1_word], G(word, _key2))) }, dataForXor);
    arrAsId.push(As._id);


    //find latest record in As
    while (As.next !== 0){
      As = await findAsIndex({ _id: As.next }, dataForXor);
      arrAsId.push(As._id);
    }

    const id = mongoose.Types.ObjectId();
    arrAsId.push(id);

    await createAsIndex({
      _id: id,
      file: file_id,
      addrDn: Dn_id,
      next: 0
    }, dataForXor);

    await findAndUpdateAsIndex({
      _id: As._id,
      next: id
    }, dataForXor);

    return { [word]: {
      Ad_id: Dn_id,
      arrAs: arrAsId,
      As_minus: As.addrDn
    }};
  }
};



//создание и обновление индексов для удаления
module.exports.AddAd = async (fileId, objAsId, key, opts) => {
  const dataForXor = generateDataForXorAd(String(fileId));
  fileId = String(fileId);
  //создать Ad
  const arrayAdId = Object.keys(objAsId).map(key => objAsId[key].Ad_id);
  const As_minus_arr = Object.keys(objAsId).map(key => objAsId[key].As_minus);
  Object.keys(objAsId).map(key => {
    objAsId[key] = objAsId[key].arrAs
  });

  await Promise.all(Object.keys(objAsId).map(async (word, index) => {

    if (As_minus_arr[index]){


      return findAndUpdateAdIndex({
        _id: ObjectId(As_minus_arr[index]),
      }, undefined, Buffer.concat([
        new Buffer.alloc(56),
        xor(String(arrayAdId[index]), _null),
        new Buffer.alloc(57),
        xor(String(objAsId[word][objAsId[word].length - 1]), _null),
        new Buffer.alloc(93)
      ]))
    }
  }));

  const res = await Object.keys(objAsId).map((word, index) => {
    const obj = {
      addrD_plus: Object.keys(objAsId).length - 1 > index ? String(arrayAdId[index + 1]) : _null,
      addrNd_minus: As_minus_arr[index] ? String(As_minus_arr[index]) : _null,
      addrNd_plus: _null,
      addrN: objAsId[word][objAsId[word].length - 1] ? String(objAsId[word][objAsId[word].length - 1]) : _null,
      addrN_minus: objAsId[word].length > 1 ? String(objAsId[word][objAsId[word].length - 2]) : _null,
      addrN_plus: _null,
      word: F(word, _key1)
    };
    return {
      _id: arrayAdId[index],
      t: xor(JSON.stringify([ obj.addrD_plus, obj.addrNd_minus, obj.addrNd_plus, obj.addrN, obj.addrN_minus, obj.addrN_plus, obj.word ]), dataForXor)
    }
  });

  await _indexAModel.insertMany(res).catch(err => {
    throw new PersonalDataStorageError(err);
  });

  //создать Td
  const Fk1_file = F(fileId, _key1);
  const record_in_Td = `d.${Fk1_file}`;


  Ts = await _indexTModel.findOneAndUpdate({ _id: _word_index_id[key] }, {
    $set: { [record_in_Td]: String(xor(String(arrayAdId[0]), G(fileId, _key2))) }
  } , opts).catch(err =>{
    throw new PersonalDataStorageError(err);
  });
};

module.exports.Search = async (word, key, opts) => {
  //найти запись в Ts
  const dataForXor = generateDataForXorAs(word);
  const Fk1_word = F(word, _key1);
  const record_in_Ts = `s.${Fk1_word}`;
  let [ Ts ] = await _indexTModel.aggregate([
    { $match: { _id: _word_index_id[key], [record_in_Ts]: { $exists: true } } },
    { $project: { [record_in_Ts]: 1 } }
  ]);

  if(!Ts) return null;

  let arrId = []
  //если есть, то найти первый элемент в As
  let As = await findAsIndex({ _id: String(xor(Ts.s[Fk1_word], G(word, _key2))) }, dataForXor);
  arrId.push(As.file);

  //найти все элементы пока (next !== 0)
  while(As.next !== 0){
    As = await findAsIndex({ _id: As.next }, dataForXor);
    arrId.push(As.file);
  }

  return arrId;
};

module.exports.Delete = async (fileId, key) => {
  
  fileId = String(fileId);
  const dataForXor = generateDataForXorAd(fileId);

  //вычислить хэш от id file
  const Fk1_file = F(fileId, _key1);
  const record_in_Td = `d.${Fk1_file}`;

  const Td = await _indexTModel.findOneAndUpdate( //TODO вернуть только нужные значение!!!!
    { _id: _word_index_id[key] },
    { $unset: { [record_in_Td]: 1 }},
    { projection: { [record_in_Td]: 1 }}
  ).catch(err =>{
    throw new PersonalDataStorageError(err);
  });


  let Ad_addr = String(xor(String(Td.d[Fk1_file]), G(fileId, _key2)));


  
  while (Ad_addr !== _null){
    let Ad = await findOneAndRemoveAdIndex({ _id: Ad_addr }, dataForXor);

    //обновить Nd_plus и N+1 в индексе Ad по адресу Nd_minus на Nd_plus и N+1
    if (Ad.addrNd_minus !== _null){
      await findAndUpdateAdIndex({
        _id: Ad.addrNd_minus,
        addrNd_plus: Ad.addrNd_plus,
        addrN_plus: Ad.addrN_plus
      }, undefined, Buffer.concat([
        new Buffer.alloc(56),
        xor(Ad.addrNd_plus, String(Ad._id)),
        new Buffer.alloc(57),
        xor(Ad.addrN_plus, Ad.addrN),
        new Buffer.alloc(93)
      ]))
    }

    //обновить Nd_minus и N-1 в индексе Ad по адресу Nd_plus на Nd_minus и N-1
    if (Ad.addrNd_plus !== _null){
      await findAndUpdateAdIndex({
        _id: Ad.addrNd_plus,
        addrNd_minus: Ad.addrNd_minus,
        addrN_minus: Ad.addrN_minus
      }, undefined, Buffer.concat([
        new Buffer.alloc(29),
        xor(Ad.addrNd_minus, String(Ad._id)),
        new Buffer.alloc(57),
        xor(Ad.addrN_minus, Ad.addrN),
        new Buffer.alloc(120)
      ]))
    }

    //обновить next в As по адресу N_1 на N+1
    if (Ad.addrN_minus !== _null){
      await findAndUpdateAsIndex({
        _id: Ad.addrN_minus,
        next: Ad.addrN_plus
      }, undefined, Buffer.concat([ new Buffer.alloc(56), xor(Ad.addrN_plus, Ad.addrN), new Buffer.alloc(2) ]));
    }

    //если это первый элемент, то есть N_minus равен нулю, а N_plus не нуль, то исправить указатель в Ts на N_plus
    if (Ad.addrN_minus === _null && Ad.addrN_plus){
      const tmp = `s.${Ad.word}`;

      const [ Ts ] = await _indexTModel.aggregate([
        { $match: { _id: _word_index_id[key], [tmp]: { $exists: true } } },
        { $project: { [tmp]: 1 } }
      ]);

      await _indexTModel.find ({ _id: _word_index_id[key] }).updateOne({
        $set: {
          [tmp]:  String(xor(xor(Ad.addrN_plus, Ad.addrN), String(Ts.s[Ad.word])))
        }
      });
    }
      
    if (Ad.addrN_minus === _null && Ad.addrN_plus === _null){
      const tmp = `s.${Ad.word}`;
      await _indexTModel.find({ _id: _word_index_id[key] }).updateOne({
        $unset: { [tmp]: 1 }
      });
    }


    let promises = []

    //удалить запись в As по адресу N
    promises.push(_indexAModel.deleteOne({ _id: Ad.addrN }));
    await Promise.all(promises);

    //переходим к следующему слову в удаляемом файле
    Ad_addr = Ad.addrD_plus;
  }
};