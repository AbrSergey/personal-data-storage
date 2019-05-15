const crypto = require("crypto");
const { sortObject } = require("./helpers");
const { error } = require("./helpers");

const iv = Buffer.alloc(16, 0);
let _algorithm = "aes-256-cbc";
let _keyLen = 32;

module.exports.setAlgorithm = (alg) => {
  _algorithm = "aes-256-cbc";
  _keyLen = 32;
  if (alg) console.log("[personal-data-storage]: Warning: support only aes-256-cbc");
}

module.exports.encryptData = (plaintext, key) => {
  try {
    const cipher = crypto.createCipheriv(_algorithm, key, iv);

    let ciphertext = cipher.update(JSON.stringify(plaintext), "utf8", "hex");
    ciphertext += cipher.final("hex");

    return ciphertext;
  } catch (err) {
    error("encryptData", err);
  }
};

module.exports.decryptData = (ciphertext, key) => {
  try {
    const decipher = crypto.createDecipheriv(_algorithm, key, iv);

    let plaintext = decipher.update(ciphertext, "hex", "utf8");
    plaintext += decipher.final("utf8");

    return JSON.parse(plaintext);
  } catch (err) {
    error("encryptData", err);
  }
};

module.exports.createSignature = (data, secret) => {
  try {
    const hmac = crypto.createHmac("sha512", secret);
    hmac.write(JSON.stringify(sortObject(data)));
    hmac.end();

    return hmac.read();
  } catch (err) {
    error("encryptData", err);
  }
};

module.exports.verifySignature = (data, oldSign, secret) => {
  try {
    const newSign =  this.createSignature(data, secret);
    const result = Buffer.compare(newSign, oldSign) === 0 ? true : false;
    return result;
  } catch (err) {
    error("encryptData", err);
  }
};
