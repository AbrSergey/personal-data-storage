const crypto = require("crypto");
const { mongoose } = require("./connect");
const { encryptData, decryptData, createSignature, verifySignature, createIndexForEntireSearch } = require("./encryption");
const { sortObject } = require("./helpers");
const PersonalDataStorageError = require("./PersonalDataStorageError");

//(ta, cf) = AddToken(K, f)
module.exports.AddToken = (f, id) => {
  const allWords = f.split(" "); //array of spliting words
  const words = allWords.filter((v, i, a) => a.indexOf(v) === i); //unique words (set of words)

  let token = {
    Fk1: createSignature(f),
    Gk2: createSignature(f),
    c: encryptData(f),
    y: []
  };

  words.forEach(word => {
    (token.y).push({
      Fk1: createSignature(word),
      Gk2: createSignature(word),
      id: id,
    }) 
  });
  return token;
}

module.exports.AddWord = async (word, file_id, word_index_id, indexAModel, indexTModel, opts) => {
  let arrAsId = [];
  const Dn_id = mongoose.Types.ObjectId();
  //проверить существует ли это слово в Ts
  console.log(word)
  const Fk1_word = createSignature(word).toString("base64");
  const record_in_Ts = `s.${Fk1_word}`;
  let [ Ts ] = await indexTModel.aggregate([
    { $match: { _id: word_index_id, [record_in_Ts]: { $exists: true } } },
    { $project: { [record_in_Ts]: 1 } }
  ]);
  
  let As;
  //если слово не существует то добавляю запсь в коллекцию indexAs
  if (!Ts){
    const instance = new indexAModel({
      file: file_id,
      addrDn: Dn_id,
      next: 0
    });
    As = await instance.save(opts).catch(err => {
      throw new PersonalDataStorageError(err);
    });
    
    //добавляю запись в Ts
    Ts = await indexTModel.findOneAndUpdate({ _id: word_index_id }, {
      $set: { [record_in_Ts]: As._id }
    } , opts).catch(err =>{
      throw new PersonalDataStorageError(err);
    });

    console.log("Inside !Ts");
    arrAsId.push(As._id);
    return { [word]: {
      Ad_id: Dn_id,
      arrAs: arrAsId,
      As_minus : 0
    } };
  }
  else {
    [ As ] = await indexAModel.find({ _id: Ts.s[Fk1_word] });
    console.log("As.next");

    arrAsId.push(As._id);

    //find latest record in As
    while (As.next !== 0){
      [ As ] = await indexAModel.find({ _id: As.next });
      arrAsId.push(As._id);
    }

    const id = mongoose.Types.ObjectId();
    arrAsId.push(id);
    const instance = new indexAModel({
      _id: id,
      file: file_id,
      addrDn: Dn_id,
      next: 0
    });
    await instance.save(opts).catch(err => {
      throw new PersonalDataStorageError(err);
    });
    await indexAModel.findOneAndUpdate({ _id: As._id }, {
      next: id
    } , opts).catch(err =>{
      throw new PersonalDataStorageError(err);
    });
    return { [word]: {
      Ad_id: Dn_id,
      arrAs: arrAsId,
      As_minus: As.addrDn
    }};
  }
};

//создание и обновление индексов для удаления
module.exports.AddFile = async (fileId, objAsId, word_index_id, indexAModel, indexTModel, opts) => {

  //создать Ad
  const arrayAdId = Object.keys(objAsId).map(key => objAsId[key].Ad_id);
  const As_minus_arr = Object.keys(objAsId).map(key => objAsId[key].As_minus);
  Object.keys(objAsId).map(key => {
    objAsId[key] = objAsId[key].arrAs
  });

 await Promise.all(Object.keys(objAsId).map(async (word, index) => {
    return indexAModel.findOneAndUpdate({ _id: mongoose.Types.ObjectId(As_minus_arr[index]) }, {
      addrNd_plus: arrayAdId[index],
      addrN_plus: objAsId[word][objAsId[word].length - 1]
    } , opts).catch(err =>{
      throw new PersonalDataStorageError(err);
    });
  }));

  const res = await Object.keys(objAsId).map((word, index) => {
    return {
      _id: arrayAdId[index],
      addrD_plus: Object.keys(objAsId).length - 1 > index ? arrayAdId[index + 1] : 0,
      addrNd_minus: As_minus_arr[index],
      addrNd_plus: 0,
      addrN: objAsId[word][objAsId[word].length - 1],
      addrN_minus: objAsId[word].length > 1 ? objAsId[word][objAsId[word].length - 2] : 0,
      addrN_plus: 0,
      word: createSignature(word).toString("base64")
    }
  });

  await indexAModel.insertMany(res).catch(err => {
    throw new PersonalDataStorageError(err);
  });

  //создать Td
  const Fk1_file = createSignature(fileId).toString("base64");
  const record_in_Ts = `d.${Fk1_file}`;

  Ts = await indexTModel.findOneAndUpdate({ _id: word_index_id }, {
    $set: { [record_in_Ts]: arrayAdId[0] }
  } , opts).catch(err =>{
    throw new PersonalDataStorageError(err);
  });

};

module.exports.Search = async (word, word_index_id, indexAModel, indexTModel, opts) => {
  //найти запись в Ts
  const Fk1_word = createSignature(word).toString("base64");
  const record_in_Ts = `s.${Fk1_word}`;
  let [ Ts ] = await indexTModel.aggregate([
    { $match: { _id: word_index_id, [record_in_Ts]: { $exists: true } } },
    { $project: { [record_in_Ts]: 1 } }
  ]);

  if(!Ts) return null;

  let arrId = []
  //если есть, то найти первый элемент в As
  let [ As ] = await indexAModel.find({ _id: Ts.s[Fk1_word] });
  arrId.push(As.file);

  //найти все элементы пока (next !== 0)
  while (As.next !== 0){
    [ As ] = await indexAModel.find({ _id: As.next });
    arrId.push(As.file);
  }

  return arrId;
};

module.exports.Delete = async (fileId, word_index_id, indexAModel, indexTModel) => {

};
