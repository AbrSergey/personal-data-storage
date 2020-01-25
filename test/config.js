const mongoose = require("mongoose");
const fs = require("fs");
const crypto = require("crypto");

module.exports.schema = {
  email: {
    validation: {
      type: String,
      required: true
    },
  },
  phone: {
    validation: {
      type: String
    }
  },
  first_name: {
    validation: {
      type: String,
      required: true
    },
    security: true,
    search: "entire"
  },
  last_name: {
    validation: {
      type: String,
      required: true
    },
    security: true
  },
  text: {
    validation: {
      type: String,
      // required: true
    },
    security: true,
    search: "word"
  }
};

// module.exports.url = "mongodb+srv://test_user:qwerty123!@cluster0-7ramg.mongodb.net/test?retryWrites=true&w=majority";
module.exports.url = "mongodb://localhost/test";
module.exports.dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  poolSize: 4
};

module.exports.modelName = "test_data";

const pwd = fs.readFileSync(__dirname + "/keys/id_rsa", "utf-8");
module.exports.key = crypto.scryptSync(pwd, pwd.substr(0,32), 32);