const crypto = require("crypto");
const { sortObject } = require("./helpers");
const PersonalDataStorageError = require("./PersonalDataStorageError");

let _key;
const _iv = Buffer.alloc(16, 0);
const _algorithm = "aes-256-cbc";
const _iterations = 64;
const _entire_index_len = 10;


module.exports.setAlgorithm = (alg) => {
  _algorithm = "aes-256-cbc";
  // if (alg) console.log("\x1b[32m%s\x1b[0m","\n[personal-data-storage] - WARNING - support only aes-256-cbc\n");
};

module.exports.setKey = (key) => _key = key;

module.exports.encryptData = (plaintext) => {
  try {
    const cipher = crypto.createCipheriv(_algorithm, _key, _iv);

    let ciphertext = cipher.update(JSON.stringify(plaintext), "utf8", "hex");
    ciphertext += cipher.final("hex");

    return ciphertext;
  } catch (err) {
    throw new PersonalDataStorageError(err);
  }
};

module.exports.decryptData = (ciphertext) => {
  try {
    const decipher = crypto.createDecipheriv(_algorithm, _key, _iv);

    let plaintext = decipher.update(ciphertext, "hex", "utf8");
    plaintext += decipher.final("utf8");

    return JSON.parse(plaintext);
  } catch (err) {
    throw new PersonalDataStorageError(err);
  }
};

module.exports.createSignature = (data) => {
  try {
    const hmac = crypto.createHmac("sha512", _key); //must be secret
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
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(data, "salt", _iterations, _entire_index_len, "sha512", (err, derivedKey) => {
      if (err) reject(new PersonalDataStorageError(err));
      resolve(derivedKey.toString("hex"));
    });
  });
};