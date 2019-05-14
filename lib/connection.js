const mongoose = require("mongoose");
let _connected = false;

mongoose.connection.on("connected", function () {
  console.log("Connected to MongoDb!");
  _connected = true;
});

mongoose.connection.on("error", function (err) {
  console.log(`MongoError: ${err}`);
});

mongoose.connection.on("disconnected", function () {
  console.log("Mongo disconnected");
  _connected = false;
});

module.exports.connect = (url) => {
  return mongoose.connect(url, { useNewUrlParser: true, poolSize: 4 });
}

module.exports.getConnect = () => {
  return _connected;
}
