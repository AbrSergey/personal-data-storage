const personalStorage = require("./helpers");
const test = require("./test");

let i = 0;

const average = (nums) => {
  return nums.reduce((a, b) => (a + b)) / nums.length;
}

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
  // console.log(word + `  ${arr}`);
  if (arr === null) arr = [];
  if (arr.length !== count) console.log(`????????????????????? word = ${word}  count = ${count} but find = ${arr.length} ??????????`);
  else console.log(`OK!!!!!!!!!!    ${word}`)
  return arr;
}

const bench = async (f, ...params) => {
  const startTime = new Date();
  const retData = await f(...params);
  return {
    retData,
    time: new Date() - startTime
  };
}

const deleting = async (id) => {
  await personalStorage.delete(id);
}

const testFunctionAdd = async (entropy, len, numberDocs = 1) => {
  let returnIdArr = [];
  let timeArr = [];

  for (let i = 0; i < numberDocs; i++){
    let comment;
    switch(entropy) {
      case "min": comment = test.constComment(len); break;
      case "average": comment = test.mediumComment(len); break;
      case "max": comment = test.uniqueComment(len); break;
    }
    const result = await bench(addRecord, comment);
    returnIdArr.push(result.retData);
    timeArr.push(result.time);
  }

  for (let i = 0; i < returnIdArr.length; i++){
    await deleting(returnIdArr[i]);
  }
  // console.log(`timeArr = ${timeArr}`);
  return average(timeArr);
}

setTimeout(async () => {
  console.log("Start bench test");
  for (let docs = 1; docs <= 100; docs = docs + 2){
    let times = [];
    for (let i = 0; i < 10; i++){
      const time = await testFunctionAdd("min", 5, docs);
      times.push(time);
    }
    // console.log(`Array of times = [${times}] mc`);

    console.log(`Docs = ${docs}; Average time = [${average(times)}] mc`);
  }
  
  console.log("Finish");
}, 1000);