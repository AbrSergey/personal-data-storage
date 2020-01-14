const crypto = require("crypto");
const { encryptData, decryptData, createSignature, verifySignature, createIndexForEntireSearch } = require("./encryption");
const { sortObject } = require("./helpers");
const PersonalDataStorageError = require("./PersonalDataStorageError");

//(y, c) = Enc(K, f)
module.exports.Enc = (f, id) => {
  //1???

  //2
  const allWords = f.split(" "); //array of spliting words
  const words = allWords.filter((v, i, a) => a.indexOf(v) === i); //unique words (set of words)
  
  let As = [];
  let Ts = {};
  words.forEach((word, index) => {
    const Ni = [id, -1]; //2a

    As.push(Ni);
    Ts[word] = [index, index] //2b
  });

  //3????
  let Ad = [];
  let Td = {};
  files.forEach(file => {
    const Di = [];
    Td[file] = "addrD1";
  });

  //4
  //5
  //6 - encrypt files
  //7
  const y = [As, Ts, Ad, Td];
  return y, c;
};

//ts = SrchToken(K, w)
module.exports.SrchToken = (w) => {
  let ts;
  //compute
  //Fk1(w)
  //Gk2(w)
  //Pk3(w)
  return ts;
};

//id = Search(y, C, ts)
module.exports.Search = (ts) => {
  let t1, t2, t3;
  //parse ts as (t1, t2, t3)

  if (!Ts[t1]) return null;
  else {
    //1
    const addr, addr1 = Ts[t1]; // XOR t2

    //2
    //3
    const N1 = As[addr];
    const id1; //compute

    //4
    // if (i >= 2 ) decrypt
    
    //5
    //fetch data by array of id and encypt it
    return []; //array of data
  }
};

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




//td = DelToken(K, f)
//(y, C) = Add(y, C, ta, c)
//(y, C) = Del(y, C, td)
//f = Dec(K, c)