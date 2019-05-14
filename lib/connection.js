const mongoose = require("mongoose");
const { error } = require("./helpers");
let _connected = false;

mongoose.connection.on("connected", function () {
  console.log("Connected to MongoDb!");
  _connected = true;
});

mongoose.connection.on("error", function (err) {
  console.log("connection", err);
});

mongoose.connection.on("disconnected", function () {
  console.log("Mongo disconnected");
  _connected = false;
});

module.exports.connect = async (url) => {
  return mongoose.connect(url, { useNewUrlParser: true, poolSize: 4 }); // add options??
}

module.exports.disconnect = () => {
  mongoose.connection.close();
}

module.exports.getConnect = () => {
  return _connected;
}
