// const mongoose = require("mongoose");
mongoose.connect(`mongodb://localhost:27017/Log`, { useNewUrlParser: true, poolSize: 4 });
mongoose.set('useFindAndModify', false);

function clone(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !(typeof add === 'object')) return;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) origin[keys[i]] = add[keys[i]];
};

module.exports = class personalData {
  constructor(mongoSchema){
    this.mongoModel = mongoose.model("mongoModel", mongoSchema);
    //this.id
    this.erased = false;
  }

  create(add){
    return new Promise(async (resolve, reject) => {
      if (this.id) return reject("Error: record already created!");

      let mongo = new this.mongoModel({ });
      clone(mongo, add);
      this.id = mongo._id;
      resolve(await mongo.save());
    });
  }

  update(query){
    return new Promise((resolve, reject) => {
      if (!this.id) return reject("Error: record not created!");

      this.mongoModel.findByIdAndUpdate({ _id: this.id }, query, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  }

  erase(){
    return new Promise((resolve, reject) => {
      if (!this.id) return reject("Error: record not created!");

      this.mongoModel.findByIdAndRemove({_id: this.id}, (err, result) => {
        if (err) return reject(err);
        this.erased = true;
        resolve(result);
      });
    });
  }

  wasErased(){
    return this.erased;
  }
}

//MAIN
const Schema = mongoose.Schema;
const mongoSchema = new Schema({
  name: { type: String },
  surname: { type: Object },
  date: { type: Number }
});

const obj1 = {
  name: "testing_name",
  surname: "22222",
  date: 2555
};

const obj2 = {
  name: "Vasia",
  surname: "Daxz",
  date: 1994
};

let user = new personalData(mongoSchema);
  user.create(obj1).then(async data => {
    // console.log(data);
    await user.erase();
    console.log(user.wasErased());
  // user.update();
}).catch(err => console.log("1 : " + err));

let user2 = new personalData(mongoSchema);
user2.create(obj2).then(data => {
  console.log(data);
}).catch(err => console.log("2 : " + err));

// user.update({name: "NeW NAME"});


// user.write(obj).then( b => console.log(b));
//END MAIN

// var user = {};
// Object.defineProperty(user, "name", {
//   value: "Вася",
//   writable: false, // запретить присвоение "user.name="
//   configurable: false // запретить удаление "delete user.name"
// });
