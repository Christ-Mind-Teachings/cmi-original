var colorable = require('colorable')

var colors = {
  red: 'red',
  green: 'green',
  blue: 'blue'
}

var result = colorable(colors, { compact: true, threshold: 0 })

console.dir(result);
