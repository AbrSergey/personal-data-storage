const crypto = require("crypto");

module.exports.encryptData = (plaintext, algorithm, password, salt, keyLen, ivLen) => {
  try {
    const key = crypto.scryptSync(password, salt, keyLen); //async ???
    const iv = crypto.randomBytes(ivLen);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let ciphertext = cipher.update(JSON.stringify(plaintext), "utf8", "hex");
    ciphertext += cipher.final("hex");

    return [ ciphertext, iv ];
  } catch (err) {
    return new Error ("Error while encrypting: " + err);
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
    return new Error ("Error while dencrypting: " + err);
  }
};
