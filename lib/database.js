const mongoose = require("mongoose"); //returns a Singleton object

const server = "localhost:27017";
const database = "Log";

class Database {
  constructor(){
    this._connect();
  }

  _connect(){
    mongoose.connect(`mongodb://${server}/${database}`, { useNewUrlParser: true, poolSize: 4 }) // вытащить в опции подключения бы
      .then(() => {
        console.log("Database connection successfull");
      })
      .catch(err => {
        console.error("Database connection error")
      })
}

module.exports = new Database();
