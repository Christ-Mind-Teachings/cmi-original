function pug_attr(t,e,n,f){return e!==!1&&null!=e&&(e||"class"!==t&&"style"!==t)?e===!0?" "+(f?t:t+'="'+t+'"'):("function"==typeof e.toJSON&&(e=e.toJSON()),"string"==typeof e||(e=JSON.stringify(e),n||e.indexOf('"')===-1)?(n&&(e=pug_escape(e))," "+t+'="'+e+'"'):" "+t+"='"+e.replace(/'/g,"&#39;")+"'"):""}
function pug_escape(e){var a=""+e,t=pug_match_html.exec(a);if(!t)return e;var r,c,n,s="";for(r=t.index,c=0;r<a.length;r++){switch(a.charCodeAt(r)){case 34:n="&quot;";break;case 38:n="&amp;";break;case 60:n="&lt;";break;case 62:n="&gt;";break;default:continue}c!==r&&(s+=a.substring(c,r)),c=r+1,s+=n}return c!==r?s+a.substring(c,r):s}
var pug_match_html=/["&<>]/;
function pug_rethrow(n,e,r,t){if(!(n instanceof Error))throw n;if(!("undefined"==typeof window&&e||t))throw n.message+=" on line "+r,n;try{t=t||require("fs").readFileSync(e,"utf8")}catch(e){pug_rethrow(n,null,r)}var i=3,a=t.split("\n"),o=Math.max(r-i,0),h=Math.min(a.length,r+i),i=a.slice(o,h).map(function(n,e){var t=e+o+1;return(t==r?"  > ":"    ")+t+"| "+n}).join("\n");throw n.path=e,n.message=(e||"Pug")+":"+r+"\n"+i+"\n\n"+n.message,n}function searchResults(locals) {var pug_html = "", pug_mixins = {}, pug_interp;var pug_debug_filename, pug_debug_line;try {;var locals_for_with = (locals || {});(function (Number, woh, wok, wot) {;pug_debug_line = 1;pug_debug_filename = ".\u002Fsearch.pug";
function getUnitName(unit) {
  var id = unit.substr(1);
  var number = Number.parseInt(id);
  return "Lesson " + number;
}

;pug_debug_line = 8;pug_debug_filename = ".\u002Fsearch.pug";
pug_mixins["hitList"] = pug_interp = function(book, hits){
var block = (this && this.block), attributes = (this && this.attributes) || {};
;pug_debug_line = 9;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + "\u003Ch3\u003E";
;pug_debug_line = 9;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + (pug_escape(null == (pug_interp = book) ? "" : pug_interp)) + "\u003C\u002Fh3\u003E";
;pug_debug_line = 10;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + "\u003Cul class=\"fa-ul\"\u003E";
;pug_debug_line = 11;pug_debug_filename = ".\u002Fsearch.pug";
// iterate hits
;(function(){
  var $$obj = hits;
  if ('number' == typeof $$obj.length) {
      for (var pug_index0 = 0, $$l = $$obj.length; pug_index0 < $$l; pug_index0++) {
        var val = $$obj[pug_index0];
;pug_debug_line = 12;pug_debug_filename = ".\u002Fsearch.pug";
var url = val.base + "?s=show" + val.location;
;pug_debug_line = 13;pug_debug_filename = ".\u002Fsearch.pug";
var unit = getUnitName(val.unit);
;pug_debug_line = 14;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + "\u003Cli\u003E";
;pug_debug_line = 14;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + "\u003Ci class=\"fa fa-search\"\u003E";
;pug_debug_line = 15;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + "\u003Ca" + (pug_attr("href", url, true, false)) + "\u003E";
;pug_debug_line = 15;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + "&nbsp; ";
;pug_debug_line = 15;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + (pug_escape(null == (pug_interp = unit) ? "" : pug_interp)) + "\u003C\u002Fa\u003E";
;pug_debug_line = 16;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + "\u003Cp\u003E";
;pug_debug_line = 16;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + (null == (pug_interp = val.context) ? "" : pug_interp) + "\u003C\u002Fp\u003E\u003C\u002Fi\u003E\u003C\u002Fli\u003E";
      }
  } else {
    var $$l = 0;
    for (var pug_index0 in $$obj) {
      $$l++;
      var val = $$obj[pug_index0];
;pug_debug_line = 12;pug_debug_filename = ".\u002Fsearch.pug";
var url = val.base + "?s=show" + val.location;
;pug_debug_line = 13;pug_debug_filename = ".\u002Fsearch.pug";
var unit = getUnitName(val.unit);
;pug_debug_line = 14;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + "\u003Cli\u003E";
;pug_debug_line = 14;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + "\u003Ci class=\"fa fa-search\"\u003E";
;pug_debug_line = 15;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + "\u003Ca" + (pug_attr("href", url, true, false)) + "\u003E";
;pug_debug_line = 15;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + "&nbsp; ";
;pug_debug_line = 15;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + (pug_escape(null == (pug_interp = unit) ? "" : pug_interp)) + "\u003C\u002Fa\u003E";
;pug_debug_line = 16;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + "\u003Cp\u003E";
;pug_debug_line = 16;pug_debug_filename = ".\u002Fsearch.pug";
pug_html = pug_html + (null == (pug_interp = val.context) ? "" : pug_interp) + "\u003C\u002Fp\u003E\u003C\u002Fi\u003E\u003C\u002Fli\u003E";
    }
  }
}).call(this);

pug_html = pug_html + "\u003C\u002Ful\u003E";
};
;pug_debug_line = 18;pug_debug_filename = ".\u002Fsearch.pug";
if (woh) {
;pug_debug_line = 19;pug_debug_filename = ".\u002Fsearch.pug";
pug_mixins["hitList"]("Way of the Heart", woh);
}
;pug_debug_line = 20;pug_debug_filename = ".\u002Fsearch.pug";
if (wot) {
;pug_debug_line = 21;pug_debug_filename = ".\u002Fsearch.pug";
pug_mixins["hitList"]("Way of Transformation", wot);
}
;pug_debug_line = 22;pug_debug_filename = ".\u002Fsearch.pug";
if (wok) {
;pug_debug_line = 23;pug_debug_filename = ".\u002Fsearch.pug";
pug_mixins["hitList"]("Way of Knowning", wok);
}}.call(this,"Number" in locals_for_with?locals_for_with.Number:typeof Number!=="undefined"?Number:undefined,"woh" in locals_for_with?locals_for_with.woh:typeof woh!=="undefined"?woh:undefined,"wok" in locals_for_with?locals_for_with.wok:typeof wok!=="undefined"?wok:undefined,"wot" in locals_for_with?locals_for_with.wot:typeof wot!=="undefined"?wot:undefined));} catch (err) {pug_rethrow(err, pug_debug_filename, pug_debug_line);};return pug_html;}