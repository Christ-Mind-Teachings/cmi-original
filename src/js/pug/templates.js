;
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    if (typeof root === 'undefined' || root !== Object(root)) {
      throw new Error('puglatizer: window does not exist or is not an object');
    }
    root.puglatizer = factory();
  }
}(this, function() {
  function pug_classes_object(val) {
    var classString = '',
      padding = '';
    for (var key in val) {
      if (key && val[key] && pug_has_own_property.call(val, key)) {
        var classString = classString + padding + key;
        var padding = ' ';
      }
    }
    return classString;
  }

  function pug_classes_array(val, escaping) {
    var classString = '',
      className, padding = '',
      escapeEnabled = Array.isArray(escaping);
    for (var i = 0; i < val.length; i++) {
      var className = pug_classes(val[i]);
      if (!className) continue;
      escapeEnabled && escaping[i] && (className = pug_escape(className));
      var classString = classString + padding + className;
      var padding = ' ';
    }
    return classString;
  }

  function pug_merge(r, e) {
    if (1 === arguments.length) {
      for (var t = r[0], a = 1; a < r.length; a++) t = pug_merge(t, r[a]);
      return t
    }
    for (var g in e)
      if ("class" === g) {
        var n = r[g] || [];
        r[g] = (Array.isArray(n) ? n : [n]).concat(e[g] || [])
      } else if ("style" === g) {
      var n = pug_style(r[g]),
        s = pug_style(e[g]);
      r[g] = n + s
    } else r[g] = e[g];
    return r
  }

  function pug_classes(s, r) {
    return Array.isArray(s) ? pug_classes_array(s, r) : s && "object" == typeof s ? pug_classes_object(s) : s || ""
  }

  function pug_style(r) {
    if (!r) return "";
    if ("object" == typeof r) {
      var t = "";
      for (var e in r) pug_has_own_property.call(r, e) && (t = t + e + ":" + r[e] + ";");
      return t
    }
    return r += "", ";" !== r[r.length - 1] ? r + ";" : r
  }

  function pug_attr(t, e, n, f) {
    return e !== !1 && null != e && (e || "class" !== t && "style" !== t) ? e === !0 ? " " + (f ? t : t + '="' + t + '"') : ("function" == typeof e.toJSON && (e = e.toJSON()), "string" == typeof e || (e = JSON.stringify(e), n || -1 === e.indexOf('"')) ? (n && (e = pug_escape(e)), " " + t + '="' + e + '"') : " " + t + "='" + e.replace(/'/g, "&#39;") + "'") : ""
  }

  function pug_attrs(t, r) {
    var a = "";
    for (var s in t)
      if (pug_has_own_property.call(t, s)) {
        var u = t[s];
        if ("class" === s) {
          u = pug_classes(u), a = pug_attr(s, u, !1, r) + a;
          continue
        }
        "style" === s && (u = pug_style(u)), a += pug_attr(s, u, !1, r)
      }
    return a
  }

  function pug_escape(e) {
    var a = "" + e,
      t = (/["&<>]/).exec(a);
    if (!t) return e;
    var r, c, n, s = "";
    for (r = t.index, c = 0; r < a.length; r++) {
      switch (a.charCodeAt(r)) {
        case 34:
          n = "&quot;";
          break;
        case 38:
          n = "&amp;";
          break;
        case 60:
          n = "&lt;";
          break;
        case 62:
          n = "&gt;";
          break;
        default:
          continue
      }
      c !== r && (s += a.substring(c, r)), c = r + 1, s += n
    }
    return c !== r ? s + a.substring(c, r) : s
  }

  function pug_rethrow(n, e, r, t) {
    if (!(n instanceof Error)) throw n;
    if (!("undefined" == typeof window && e || t)) throw n.message += " on line " + r, n;
    try {
      t = t || require("fs").readFileSync(e, "utf8")
    } catch (i) {
      pug_rethrow(n, null, r)
    }
    var a = 3,
      o = t.split("\n"),
      h = Math.max(r - a, 0),
      s = Math.min(o.length, r + a),
      a = o.slice(h, s).map(function(n, e) {
        var t = e + h + 1;
        return (t == r ? "  > " : "    ") + t + "| " + n
      }).join("\n");
    throw n.path = e, n.message = (e || "Pug") + ":" + r + "\n" + a + "\n\n" + n.message, n
  }
  var pug = {
    merge: function pug_merge(r, e) {
      if (1 === arguments.length) {
        for (var t = r[0], a = 1; a < r.length; a++) t = pug_merge(t, r[a]);
        return t
      }
      for (var g in e)
        if ("class" === g) {
          var n = r[g] || [];
          r[g] = (Array.isArray(n) ? n : [n]).concat(e[g] || [])
        } else if ("style" === g) {
        var n = pug_style(r[g]),
          s = pug_style(e[g]);
        r[g] = n + s
      } else r[g] = e[g];
      return r
    },
    classes: function pug_classes(s, r) {
      return Array.isArray(s) ? pug_classes_array(s, r) : s && "object" == typeof s ? pug_classes_object(s) : s || ""
    },
    style: function pug_style(r) {
      if (!r) return "";
      if ("object" == typeof r) {
        var t = "";
        for (var e in r) pug_has_own_property.call(r, e) && (t = t + e + ":" + r[e] + ";");
        return t
      }
      return r += "", ";" !== r[r.length - 1] ? r + ";" : r
    },
    attr: function pug_attr(t, e, n, f) {
      return e !== !1 && null != e && (e || "class" !== t && "style" !== t) ? e === !0 ? " " + (f ? t : t + '="' + t + '"') : ("function" == typeof e.toJSON && (e = e.toJSON()), "string" == typeof e || (e = JSON.stringify(e), n || -1 === e.indexOf('"')) ? (n && (e = pug_escape(e)), " " + t + '="' + e + '"') : " " + t + "='" + e.replace(/'/g, "&#39;") + "'") : ""
    },
    attrs: function pug_attrs(t, r) {
      var a = "";
      for (var s in t)
        if (pug_has_own_property.call(t, s)) {
          var u = t[s];
          if ("class" === s) {
            u = pug_classes(u), a = pug_attr(s, u, !1, r) + a;
            continue
          }
          "style" === s && (u = pug_style(u)), a += pug_attr(s, u, !1, r)
        }
      return a
    },
    escape: function pug_escape(e) {
      var a = "" + e,
        t = (/["&<>]/).exec(a);
      if (!t) return e;
      var r, c, n, s = "";
      for (r = t.index, c = 0; r < a.length; r++) {
        switch (a.charCodeAt(r)) {
          case 34:
            n = "&quot;";
            break;
          case 38:
            n = "&amp;";
            break;
          case 60:
            n = "&lt;";
            break;
          case 62:
            n = "&gt;";
            break;
          default:
            continue
        }
        c !== r && (s += a.substring(c, r)), c = r + 1, s += n
      }
      return c !== r ? s + a.substring(c, r) : s
    },
    rethrow: function pug_rethrow(n, e, r, t) {
      if (!(n instanceof Error)) throw n;
      if (!("undefined" == typeof window && e || t)) throw n.message += " on line " + r, n;
      try {
        t = t || require("fs").readFileSync(e, "utf8")
      } catch (i) {
        pug_rethrow(n, null, r)
      }
      var a = 3,
        o = t.split("\n"),
        h = Math.max(r - a, 0),
        s = Math.min(o.length, r + a),
        a = o.slice(h, s).map(function(n, e) {
          var t = e + h + 1;
          return (t == r ? "  > " : "    ") + t + "| " + n
        }).join("\n");
      throw n.path = e, n.message = (e || "Pug") + ":" + r + "\n" + a + "\n\n" + n.message, n
    }
  }

  var puglatizer = {}
  puglatizer["bookmark"] = function template(n) {
    var i, a, c, e = "";
    try {
      c = 1, e += "<!--mixin channelList(src)-->", c = 2, e += "<!--  h3= src.name-->", c = 3, e += "<!--  ul.fa-ul-->", c = 4, e += "<!--    each info in src.info-->", c = 5, e += "<!--      li: i.fa-ul.fa.fa-bookmark-->", c = 6, e += "<!--        a.cmiBookmarkLink(href= info.page)-->", c = 7, e += '<!--          = info.book + ": " + info.unit-->', c = 8, e += "<!---->", c = 9, e += "<!--each src in source-->", c = 10, e += "<!--  +channelList(src)-->", c = 11, e += "<h3>", c = 11, e = e + pug.escape(null == (i = "My name is Rick") ? "" : i) + "</h3>"
    } catch (r) {
      pug.rethrow(r, a, c)
    }
    return e
  };

  puglatizer["search"] = function template(t) {
    var a, i, n, e = "",
      o = {};
    try {
      var r = t || {};
      (function(t, i, r, s) {
        function u(a) {
          var i = a.substr(1),
            n = t.parseInt(i);
          return "Lesson " + n
        }
        n = 1, n = 8, o.hitList = a = function(t, i) {
          this && this.block, this && this.attributes || {};
          n = 9, e += "<h3>", n = 9, e = e + pug.escape(null == (a = t) ? "" : a) + "</h3>", n = 10, e += '<ul class="fa-ul">', n = 11,
            function() {
              var t = i;
              if ("number" == typeof t.length)
                for (var o = 0, r = t.length; r > o; o++) {
                  var s = t[o];
                  n = 12;
                  var l = s.base + "?s=show" + s.location;
                  n = 13;
                  var f = u(s.unit);
                  n = 14, e += "<li>", n = 14, e += '<i class="fa fa-search">', n = 15, e = e + "<a" + pug.attr("href", l, !0, !1) + ">", n = 15, e += "&nbsp; ", n = 15, e = e + pug.escape(null == (a = f) ? "" : a) + "</a>", n = 16, e += "<p>", n = 16, e = e + (null == (a = s.context) ? "" : a) + "</p></i></li>"
                } else {
                  var r = 0;
                  for (var o in t) {
                    r++;
                    var s = t[o];
                    n = 12;
                    var l = s.base + "?s=show" + s.location;
                    n = 13;
                    var f = u(s.unit);
                    n = 14, e += "<li>", n = 14, e += '<i class="fa fa-search">', n = 15, e = e + "<a" + pug.attr("href", l, !0, !1) + ">", n = 15, e += "&nbsp; ", n = 15, e = e + pug.escape(null == (a = f) ? "" : a) + "</a>", n = 16, e += "<p>", n = 16, e = e + (null == (a = s.context) ? "" : a) + "</p></i></li>"
                  }
                }
            }.call(this), e += "</ul>"
        }, n = 18, i && (n = 19, o.hitList("Way of the Heart", i)), n = 20, s && (n = 21, o.hitList("Way of Transformation", s)), n = 22, r && (n = 23, o.hitList("Way of Knowning", r))
      }).call(this, "Number" in r ? r.Number : "undefined" != typeof Number ? Number : void 0, "woh" in r ? r.woh : "undefined" != typeof woh ? woh : void 0, "wok" in r ? r.wok : "undefined" != typeof wok ? wok : void 0, "wot" in r ? r.wot : "undefined" != typeof wot ? wot : void 0)
    } catch (s) {
      pug.rethrow(s, i, n)
    }
    return e
  };


  return puglatizer;
}));