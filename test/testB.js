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

const generateString = () => {
  let x;
  while (!x) x = Math.random().toString(36).substring(2, Math.floor(Math.random() * 10) + 2);
  return x;
}

//добавляю в базу количество записей равное шагу измерения
//в цикле измеряю среднее время добавления i-ой записи и удаления этой же записи 
const testFunction = async (entropy, wordsNum, numberDocs) => {
  
  //записать опред кол записей

  for (let i = 0; i < numberDocs - 1; i++){
    await personalStorage.upsert({
      first_name: generateString(),
      last_name: generateString(),
      phone: generateString(),
      email: generateString(),
      text: generateData("max", Math.floor(Math.random()*10 + 1))
    });
  }

  let timeAdd = [];
  let timeDelete = [];
  let timeSearchOpen = [];
  let timeSearchEntire = [];
  let timeSearchWord = [];

  for (let i = 0; i < 1; i++){
    const text = generateData("max", Math.floor(Math.random()*10 + 1));
    const email = generateString();
    const first_name = generateString();

    //add
    const resultAdd = await bench(personalStorage.upsert, {
      first_name,
      last_name: generateString(),
      phone: generateString(),
      email,
      text
    });
    timeAdd.push(resultAdd.time);

    //поиск по откр данным
    const resultSearchOpen = await bench(personalStorage.find, "email", email);
    timeSearchOpen.push(resultSearchOpen.time);

    //поиск по документу
    const resultSearchEntire = await bench(personalStorage.find, "first_name", first_name);
    timeSearchEntire.push(resultSearchEntire.time);


    //поиск по слову
    const word = text.split(" ")[0];
    const resultSearchWord = await bench(findWordAndCheck, word);
    timeSearchWord.push(resultSearchWord.time);

    //delete
    const resultDelete = await bench(deleting, resultAdd.retData);
    timeDelete.push(resultDelete.time);
  }

  await personalStorage.upsert({
    first_name: generateString(),
    last_name: generateString(),
    phone: generateString(),
    email: generateString(),
    text: generateData("max", Math.floor(Math.random()*100))
  });

  return {
    add: average(timeAdd),
    delete: average(timeDelete),
    searchOpen: average(timeSearchOpen),
    searchEntire: average(timeSearchEntire),
    searchWord: average(timeSearchWord)
  };
}

setTimeout(async () => {
  const _entropy = "average";
  const _wordsNum = 10;
  const _step = 200;

  // console.log(`Entropy = ${_entropy}`);
  // console.log(`Number words in comment = ${_wordsNum}`);
  console.log("Start bench test");

  for (let docs = _step; docs <= 20000; docs = docs + _step){
    const averageTime = await testFunction(_entropy, _wordsNum, _step);
    console.log(`Docs: ${docs}       Add: ${averageTime.add} mc          Delete: ${averageTime.delete} mc         SearchOpen: ${averageTime.searchOpen} mc     SearchEntire: ${averageTime.searchEntire} mc         SearchWord: ${averageTime.searchWord} mc`);
  }
  
  console.log("Finish");
}, 1000);