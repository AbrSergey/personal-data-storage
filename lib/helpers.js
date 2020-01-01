const PersonalDataStorageError = require("./PersonalDataStorageError");

const filterObjectBySecurityValue = (object, value) => {
  const columns = Object.keys(object).map(column => {
    if (value === false && !object[column]["security"]) return column;
    else return object[column]["security"] === value ? column : undefined;
  });
  return columns.filter(item => item);
};

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

module.exports.generateValidationScheme = async (initSchema) => {
  const validateScheme = {};
  Object.keys(initSchema).forEach(key => {
    if (!initSchema[key].validation) throw new PersonalDataStorageError(`Validation property doesn't exists for ${key}`);
    validateScheme[key] = initSchema[key].validation;
  });
  return { ...validateScheme };
};

module.exports.generateOpenKeys = (initSchema) => filterObjectBySecurityValue(initSchema, false);
module.exports.generateSecureKeys = (initSchema) => filterObjectBySecurityValue(initSchema, true);