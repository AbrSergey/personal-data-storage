const mongoose = require("mongoose");
let _connected = false;

mongoose.connection.on("connected", function () {
  console.log("\x1b[32m%s\x1b[0m","\n[personal-data-storage]: Connected to MongoDb!");
  _connected = true;
});

mongoose.connection.on("error", function (err) {
  console.log(`\x1b[31m \n[personal-data-storage]: Connection ${err}`);
});

mongoose.connection.on("disconnected", function () {
  console.log("\x1b[31m \n[personal-data-storage]: Mongo disconnected");
  _connected = false;
});

module.exports.connect = async (url, options) => {
  return mongoose.createConnection(url, options);
};

module.exports.disconnect = () => {
  mongoose.connection.close();
};

module.exports.getConnect = () => {
  return _connected;
};
