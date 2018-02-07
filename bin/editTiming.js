/*
 * Date: Feb 6, 2018
 * Author: Rick
 *
 * editTiming.js
 *
 * Deletes a single time point from the time array of a timing file and renumbers the
 * remaining items of the array
 *
 * example: $ node editTiming -d <paragraph number> <filename>
 *
 * where: paragraph number is the array index to delete
 *        filename is the name of the timing file. eg: 2002/061202.js
 *
 * Has been tested for Raj timing files only
 *
 * Output: to the run directory with name of input file where '/' replaced by "_"
 */

var fs = require('fs');
var program = require("commander");
var pretty = require("js-object-pretty-print").pretty;
const base = "/Users/rmercer/Projects/cmi/site/www/public/js/audio/nwffacim";

program
  .version('0.0.1')
  .usage('[options] <timing filename>')
  .option('-d, --delete <pnumber> [0...n]')
  .parse(process.argv);

if (!program.delete) {
  console.log("specify pnum to delete");
  process.exit(1);
}

if (program.args.length == 0) {
  console.log("Specify timing file to be modified?");
  process.exit(1);
}

//paragraph to delete and start of renumbering counter
let counter = parseInt(program.delete, 10);

let timingData;
const fn = `${base}/${program.args[0]}`;
try {
  eval(fs.readFileSync(fn, 'utf8'));
}
catch (e) {
  console.log("file: %s, was not found", fn);
  process.exit(1);
}

//console.log(cmiAudioTimingData.time);
console.log("transcript has %s paragraphs", cmiAudioTimingData.time.length);
console.log("deleting: ", cmiAudioTimingData.time[counter]);

let info = {
  modifyDate: new Date().toString(),
  itemDeleted: counter,
  dataDeleted: cmiAudioTimingData.time[counter],
  originalLength: cmiAudioTimingData.time.length
};

if (!cmiAudioTimingData.history) {
  cmiAudioTimingData.history = [];
}

cmiAudioTimingData.history[cmiAudioTimingData.history.length] = info;

//renumber time array
for (let i = counter + 1; i < cmiAudioTimingData.time.length; i++) {
  cmiAudioTimingData.time[i].id = `p${counter}`;
  counter++;
}

//delete item program.delete
cmiAudioTimingData.time.splice(parseInt(program.delete, 10), 1);

//console.dir(cmiAudioTimingData);
let editedFile = `var cmiAudioTimingData = ${pretty(cmiAudioTimingData, 2)};`;
fs.writeFileSync(program.args[0].replace(/\//,"_"), editedFile);

//console.log(editedFile);



