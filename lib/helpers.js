const copy = function copyRecursive(o){
  let output, v, key;
  output = Array.isArray(o) ? [] : {};
  for (key in o) {
    v = o[key];
    output[key] = (typeof v === "object") ? copyRecursive(v) : v;
  }
  return output;
};

module.exports.copy = copy;

module.exports.sortObject = (o) => {
    return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
}

module.exports.matchKeys = (obj2, obj1) => {
  let arr = [];
  Object.keys(obj1).forEach(key => {
    if (Object.keys(obj2).includes(key)) arr.push(key);
  });

  return arr;
}

exports.error = (func, message) => {
    console.error(`[personal-data-storage] - ${func}() - ${message}`)
}
