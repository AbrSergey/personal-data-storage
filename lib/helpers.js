const PersonalDataStorageError = require("./PersonalDataStorageError");

module.exports.deleteUndefinedKey = (obj) => {
  Object.keys(obj).forEach(key => obj[key] === undefined ? delete obj[key] : "");
},

module.exports.sortObject = (o) => {
  return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
};

module.exports.matchKeys = (obj1, obj2) => {
  let arr = [];
  Object.keys(obj1).forEach(key => {
    if (Object.keys(obj2).includes(key)) arr.push(key);
  });
  return arr;
};

module.exports.checkSchemeOnValidate = async (scheme) => {
  Object.keys(scheme).forEach(key => {
    if (!scheme[key].validation) throw new PersonalDataStorageError(`Validation property doesn't exists for ${key}`);
  });
}