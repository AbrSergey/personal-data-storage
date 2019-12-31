let mongoose = require("mongoose");
let mongo = new mongoose.Mongoose();
let _connected = false;

mongo.connection.on("connected", function () {
  console.log("\x1b[32m%s\x1b[0m","\n[personal-data-storage]: Connected to MongoDb!");
  _connected = true;
});

mongo.connection.on("error", function (err) {
  console.log(`\x1b[31m \n[personal-data-storage]: Connection ${err}`);
});

mongo.connection.on("disconnected", function () {
  console.log("\x1b[31m \n[personal-data-storage]: Mongo disconnected");
  _connected = false;
});

module.exports.connect = async (url, options) => {
  return mongo.connect(url, options);
};

module.exports.disconnect = () => {
  mongo.connection.close();
};

module.exports.getConnect = () => {
  return _connected;
};

module.exports.mongoose = mongo;