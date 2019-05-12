const mongoose = require("mongoose");

function copy(o) {
  let output, v, key;
  output = Array.isArray(o) ? [] : {};
  for (key in o) {
    v = o[key];
    output[key] = (typeof v === "object") ? copy(v) : v;
  }
  return output;
};

let _connected = true;
let _model;

exports.db = {
  connect: (url, schema, modelName) => {
    return new Promise(async (resolve, reject) => {
      _model = mongoose.model(modelName, schema);
      resolve( await mongoose.connect(url, { useNewUrlParser: true, poolSize: 4 }) );
    });
  },

  close: () => {
    try {
      mongoose.connection.close();
      _connected = false;
    } catch (err) {
      _connected = true;
      throw new Error ("cannot close connection");
    }
  },

  isConnected: () => {
    return _connected;
  },

  insert: (object) => {
    return new Promise(async (resolve, reject) => {
      if (!_connected) return reject("Error: please connect first to a database with mongocrypt.connect(url, schema, modelName)");

      let instance = new _model(object);
      resolve(await instance.save());
    });
  },

  find: (query) => {
    return new Promise(async (resolve, reject) => {
      if (!_connected) return reject("Error: please connect first to a database with mongocrypt.connect(url, schema, modelName)");

      let tmp = _model.find(query);
      resolve(await tmp.exec());
    });
  }
}

// update(query){
//   return new Promise((resolve, reject) => {
//     if (!this.id) return reject("Error: record not created!");
//
//     this.mongoModel.findByIdAndUpdate({ _id: this.id }, query, (err, result) => {
//       if (err) reject(err);
//       resolve(result);
//     });
//   });
// }
//
// erase(){
//   return new Promise((resolve, reject) => {
//     if (!this.id) return reject("Error: record not created!");
//
//     this.mongoModel.findByIdAndRemove({_id: this.id}, (err, result) => {
//       if (err) return reject(err);
//       this.erased = true;
//       resolve(result);
//     });
//   });
// }
//
// wasErased(){
//   return this.erased;
// }
