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
