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

exports.error = (func, message) => {
    console.error(`[personal-data-storage] - ${func}() - ${message}`)
}
