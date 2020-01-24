const crypto = require("crypto");
const { sortObject } = require("./helpers");
const PersonalDataStorageError = require("./PersonalDataStorageError");

let _key;
// const _iv = Buffer.alloc(16, 0);
const _algorithm = "aes-256-cbc";
const _iterations = 4096; //Feb 2005 - AES in Kerberos 5 'defaults' to 4096 rounds of SHA-1. (source: RFC 3962)
const _entire_index_len = 10;
const _hash = "sha256"

const getIv = (iv) => {
  if (!iv) return Buffer.alloc(16, 0);
  else if (iv.length < 16) return Buffer.from(iv.concat("0",repeat(16 - iv.length)));
  else return Buffer.from(iv.slice(0, 16));
}

// H1, H2 - crypto.createHash('sha256')
//F, G, P - crypto.createHmac('sha256', 'a secret');


//для генерации паролей crypto.pbkdf2(password, salt, iterations, keylen, digest, callback)
// salt должно быть максимально уникально. Рекомендуется создавать рандомную "соль" и устанавливать ее длину больше, чем 16 байт. См. NIST SP 800-132.

//crypto.randomBytes(size[, callback])
// Генерирует криптографически защищенные псевдорандомные данные. Аргумент size является числом, отражающим количество сгенерированных байтов.


// crypto.createCipheriv(algorithm, key, iv)
// Создает и возвращает объект Cipher, который использует заданные algorithm, keyи вектор инициализации iv.


module.exports.generateKey = (secret, salt) => {
  return crypto.pbkdf2Sync(secret, salt, _iterations, 64, _hash);
}

module.exports.setKey = (key) => {
  _key = crypto.pbkdf2Sync(key, key, _iterations, 32, _hash);
};

module.exports.H1 = (data) => {
  return crypto.createHash(_hash).update(data).digest("hex");
}

module.exports.H2 = (data) => {
  return crypto.createHash(_hash).update(data).digest("hex");
}

module.exports.G = (word, key) => {
  const hmac = crypto.createHmac(_hash, key); //must be secret
  hmac.update(word)
  return hmac.digest('hex');
}

module.exports.P = (word, key) => {
  const hmac = crypto.createHmac(_hash, key); //must be secret
  hmac.update(word)
  return hmac.digest('hex');
}

module.exports.F = (word, key) => {
  const hmac = crypto.createHmac(_hash, key); //must be secret
  // hmac.write(word);
  // hmac.end();
  hmac.update(word)
  return hmac.digest('hex');
}

module.exports.encryptData = (plaintext, iv) => {
  try {
    const cipher = crypto.createCipheriv(_algorithm, _key, getIv(iv));

    let ciphertext = cipher.update(JSON.stringify(plaintext), "utf8", "hex");
    ciphertext += cipher.final("hex");

    return ciphertext;
  } catch (err) {
    throw new PersonalDataStorageError(err);
  }
};

module.exports.decryptData = (ciphertext, iv) => {
  try {
    const decipher = crypto.createDecipheriv(_algorithm, _key, getIv(iv));

    let plaintext = decipher.update(ciphertext, "hex", "utf8");
    plaintext += decipher.final("utf8");

    return JSON.parse(plaintext);
  } catch (err) {
    throw new PersonalDataStorageError(err);
  }
};

module.exports.createSignature = (data) => {
  try {
    const hmac = crypto.createHmac(_hash, _key); //must be secret
    hmac.write(JSON.stringify(sortObject(data)));
    hmac.end();

    return hmac.read();
  } catch (err) {
    throw new PersonalDataStorageError(err);
  }
};

module.exports.verifySignature = (data, oldSign) => {
  try {
    const newSign = this.createSignature(data, _key); //must be secret
    const result = Buffer.compare(newSign, oldSign) === 0 ? true : false;
    return result;
  } catch (err) {
    throw new PersonalDataStorageError(err);
  }
};

module.exports.createIndexForEntireSearch = (data) => {
  try {
    const cipher = crypto.createCipheriv(_algorithm, _key, getIv());

    let ciphertext = cipher.update(JSON.stringify(data), "utf8", "hex");
    ciphertext += cipher.final("hex");

    return ciphertext;

    // return new Promise((resolve, reject) => {
    //   crypto.pbkdf2(data, "salt", _iterations, _entire_index_len, _hash, (err, derivedKey) => {
    //     if (err) reject(new PersonalDataStorageError(err));
    //     resolve(derivedKey.toString("hex"));
    //   });
    // });
  } catch (err) {
    throw new PersonalDataStorageError(err);
  }
};