const personalStorage = require("./helpers");
const test = require("./test");

let i = 0;

const addRecord = async (text) => {
  i = i + 1;
  return await personalStorage.upsert({
    first_name: "Qwerty",
    last_name: "Parol",
    phone: String(i),
    email: text,
    text: text
  });
}

const findWordAndCheck = async (word, count) => {
  let arr = await personalStorage.find("text", word);

  // console.log(arr)
  // console.log(word + `  ${arr}`);
  if (arr === null) arr = [];
  if (arr.length !== count) console.log(`????????????????????? word = ${word}  count = ${count} but find = ${arr.length} ??????????`);
  else console.log(`OK!!!!!!!!!!    ${word}`)
  return arr;
}

const bench = async (f) => {
  const startTime = new Date();
  for (let i = 0; i < 1; i++) await f();
  return new Date() - startTime;
}

const deleting = async (id) => {
  // console.log("before deleting")
  await personalStorage.delete(id);
  console.log("deleted")
}

const testFunction = async () => {
  const id1 = await addRecord("Hi Hi Hi Hi Hi");
  const id2 = await addRecord("Hi Miha");
  const id3 = await addRecord("this is the biggest Hi Miha");
  const id4 = await addRecord("no no no"); //Hello world and it is no no no
  const id5 = await addRecord("Opa the biggest");
  const id6 = await addRecord("Hi hi");
  const id7 = await addRecord("no Hello");
  const id8 = await addRecord("drrr");
  const id9 = await addRecord("DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled willrr");
  const id10 = await addRecord("UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function");

  await findWordAndCheck("Hi", 4); //4
  await findWordAndCheck("Miha", 2); //2
  await findWordAndCheck("this", 1); //1
  await findWordAndCheck("is", 1); //1
  await findWordAndCheck("no", 2); //1
  await findWordAndCheck("UnhandledPromiseRejectionWarning:", 1); //1
  await findWordAndCheck("---", 0); //0

  await deleting(id1);
  await deleting(id4);
  await deleting(id5);
  await deleting(id10);

  await findWordAndCheck("Hi", 3); //4
  await findWordAndCheck("Miha", 2); //2
  await findWordAndCheck("this", 1); //1
  await findWordAndCheck("is", 1); //1
  await findWordAndCheck("no", 1); //1
  await findWordAndCheck("UnhandledPromiseRejectionWarning:", 0); //1
  await findWordAndCheck("---", 0); //0

  await deleting(id2);
  await deleting(id6);
  await deleting(id7);
  await deleting(id9);

  await findWordAndCheck("Hi", 1); //4
  await findWordAndCheck("Miha", 1); //2
  await findWordAndCheck("this", 1); //1
  await findWordAndCheck("is", 1); //2
  await findWordAndCheck("no", 0); //1
  await findWordAndCheck("UnhandledPromiseRejectionWarning:", 0); //1
  await findWordAndCheck("---", 0); //0
  
  await deleting(id3);
  await deleting(id8);
}

setTimeout(async () => {
  console.log("Start bench test");
  const time = await bench(testFunction);
  console.log(`Time is ${time} + mc`);
}, 1000);

//на 10 раз 4,2 - 4.5 c
//на 10 раз 3.8 - 4.4 c