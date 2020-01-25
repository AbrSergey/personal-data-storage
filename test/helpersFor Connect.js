const { schema, dbOptions, url, modelName, key } = require("./config");
const userProfileStorage = require("./modules/personal-data-storage");

userProfileStorage.connect(url, schema, modelName, key, dbOptions)
  .then(r => console.log(r))
  .catch(err => console.log(`[personal-data-storage]: ${err}`));

module.exports = userProfileStorage;