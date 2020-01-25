const personalStorage = require("./helpers");

const testFunction = async () => {
  await personalStorage.upsert({
    first_name: "Qwerty",
    last_name: "Parol",
    phone: "123",
    email: "email",
    text: "text"
  });

  const res = await personalStorage.find("first_name", "Qwerty");

  console.log(res);

  // await personalStorage.delete(id);

}

setTimeout(async () => {
  await testFunction();
}, 1000);