const crypto = require("crypto");
const { sortObject } = require("./helpers");
const PersonalDataStorageError = require("./PersonalDataStorageError");


class Encryption {
  #algorithm = "aes-256-cbc";
  #iterations = 4096; //Feb 2005 - AES in Kerberos 5 'defaults' to 4096 rounds of SHA-1. (source: RFC 3962)
  #hash = "sha256";
  #key;

  constructor(secret) {
    this.#key = crypto.pbkdf2Sync(secret, secret, 4096, 32, "sha256");
  }
  
  _getIv(iv){
    if (!iv) return Buffer.alloc(16, 0);
    else if (iv.length < 16) return Buffer.from(iv.concat("0".repeat(16 - iv.length)));
    else return Buffer.from(iv.slice(0, 16));
  }

  encryptData(plaintext, iv){
    try {
      const cipher = crypto.createCipheriv(this.#algorithm, this.#key, this._getIv(iv));
      return cipher.update(JSON.stringify(plaintext), "utf8", "hex") + cipher.final("hex");
    } catch (err) {
      throw new PersonalDataStorageError(err);
    }
  }

  decryptData(ciphertext, iv){
    try {
      const decipher = crypto.createDecipheriv(this.#algorithm, this.#key, this._getIv(iv));
      return JSON.parse(decipher.update(ciphertext, "hex", "utf8") + decipher.final("utf8"));
    } catch (err) {
      throw new PersonalDataStorageError(err);
    }
  }

  createSignature(data){
    try {
      const hmac = crypto.createHmac(this.#hash, this.#key); //must be secret
      hmac.write(JSON.stringify(sortObject(data)));
      hmac.end();
      return hmac.read();
    } catch (err) {
      throw new PersonalDataStorageError(err);
    }
  }

  verifySignature(data, oldSign){
    try {
      const newSign = this.createSignature(data, this.#key); //must be secret
      return Buffer.compare(newSign, oldSign) === 0 ? true : false;
    } catch (err) {
      throw new PersonalDataStorageError(err);
    }
  }

  createIndexForEntireSearch(data){
    try {
      const cipher = crypto.createCipheriv(this.#algorithm, this.#key, this._getIv());
      let ciphertext = cipher.update(JSON.stringify(data), "utf8", "hex");
      ciphertext += cipher.final("hex");
      return ciphertext; //укоротить до _entire_index_len бит
    } catch (err) {
      throw new PersonalDataStorageError(err);
    }
  }

  generateKey(secret, salt){
    return crypto.pbkdf2Sync(secret, salt, this.#iterations, 64, this.#hash);
  }

  H1(data){
    return crypto.createHash(this.#hash).update(data).digest("hex");
  }

  H2(data){
    return crypto.createHash(this.#hash).update(data).digest("hex");
  }

  G(word, key){
    const hmac = crypto.createHmac(this.#hash, key); //must be secret
    hmac.update(word)
    return hmac.digest("hex");
  }
  
  P(word, key){
    const hmac = crypto.createHmac(this.#hash, key); //must be secret
    hmac.update(word)
    return hmac.digest("hex");
  }
  
  F(word, key){
    const hmac = crypto.createHmac(this.#hash, key); //must be secret
    hmac.update(word)
    return hmac.digest("hex");
  }
}

module.exports = Encryption;