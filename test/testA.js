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
  // if (arr === null) arr = [];
  // if (arr.length !== count) console.log(`????????????????????? word = ${word}  count = ${count} but find = ${arr.length} ??????????`);
  // else console.log(`OK!!!!!!!!!!    ${word}`)
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

const generateData = (entropy, wordsNum) => {
  let comment;
  switch(entropy) {
    case "min": comment = test.constComment(wordsNum); break;
    case "average": comment = test.mediumComment(wordsNum); break;
    case "max": comment = test.uniqueComment(wordsNum); break;
  }
  return comment;
}

//добавляю в базу количество записей равное шагу измерения
//в цикле измеряю среднее время добавления i-ой записи и удаления этой же записи 
const testFunction = async (entropy, wordsNum, numberDocs) => {
  for (let i = 0; i < numberDocs - 1; i++){
    await addRecord(generateData(entropy, wordsNum));
  }

  let timeAdd = [];
  let timeDelete = [];
  let timeSearch = [];

  for (let i = 0; i < 10; i++){
    const testData = generateData(entropy, wordsNum);

    //add
    const resultAdd = await bench(addRecord, testData);
    timeAdd.push(resultAdd.time);

    //search
    const word = testData.split(" ")[0];
    const resultSearch = await bench(findWordAndCheck, word);
    timeSearch.push(resultSearch.time);

    //delete
    const resultDelete = await bench(deleting, resultAdd.retData);
    timeDelete.push(resultDelete.time);
  }

  await addRecord(generateData(entropy, wordsNum));

  return {
    add: average(timeAdd),
    delete: average(timeDelete),
    search: average(timeSearch)
  };
}

setTimeout(async () => {
  const _entropy = "max";
  const _wordsNum = 10;
  const _step = 50;

  console.log(`Entropy = ${_entropy}`);
  console.log(`Number words in comment = ${_wordsNum}`);
  console.log("Start bench test");

  for (let docs = _step; docs <= 2000; docs = docs + _step){
    const averageTime = await testFunction(_entropy, _wordsNum, _step);
    console.log(`Docs: ${docs}                Add: ${averageTime.add} mc                Delete: ${averageTime.delete} mc              Search: ${averageTime.search} mc`);
  }
  
  console.log("Finish");
}, 1000);