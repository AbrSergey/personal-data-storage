const mongoose = require("mongoose");
let _connected = false;

mongoose.connection.on("connected", function () {
  console.log("[personal-data-storage]: Connected to MongoDb!");
  _connected = true;
});

mongoose.connection.on("error", function (err) {
  console.log("[personal-data-storage]: Connection", err);
});

mongoose.connection.on("disconnected", function () {
  console.log("[personal-data-storage]: Mongo disconnected");
  _connected = false;
});

module.exports.connect = async (url, options) => {
  return mongoose.connect(url, options);
};

module.exports.disconnect = () => {
  mongoose.connection.close();
};

module.exports.getConnect = () => {
  return _connected;
};
