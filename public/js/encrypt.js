var sjcl = require('sjcl');

var e = sjcl.encrypt("K1p2@y1*", "this is my secret data");
console.log(e);

console.log(sjcl.decrypt("K1p2@y1*", e));

