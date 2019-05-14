const crypto = require("crypto");
const { sortObject } = require("./helpers");
const { error } = require("./helpers");

module.exports.encryptData = (plaintext, algorithm, password, salt, keyLen, ivLen) => {
  try {
    const key = crypto.scryptSync(password, salt, keyLen); //async ???
    const iv = crypto.randomBytes(ivLen);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let ciphertext = cipher.update(JSON.stringify(plaintext), "utf8", "hex");
    ciphertext += cipher.final("hex");

    return [ ciphertext, iv ];
  } catch (err) {
    error("encryptData", err);
  }
};

module.exports.decryptData = (ciphertext, iv, algorithm, password, salt, keyLen) => {
  try {
    const key = crypto.scryptSync(password, salt, keyLen);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

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

module.exports.verifySignature = (data, signature, secret) => {
  try {
    const hmac = crypto.createHmac("sha512", secret);
    hmac.write(JSON.stringify(sortObject(data)));
    hmac.end();
    const sig = hmac.read();

    const result = Buffer.compare(sig, signature) === 0 ? true : false;
    return result;
  } catch (err) {
    error("encryptData", err);
  }
};
