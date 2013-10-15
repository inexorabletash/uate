(function(global) {

  function uate(a, b) {
    var tag = b === undefined ? undefined : a,
        template = b === undefined ? a : b;

    if (typeof tag === 'function')
      var callExpr = String(tag).replace(/^function (.*)\([\s\S]*$/, '$1');
    else if (tag !== undefined)
      callExpr = String(tag);
    else
      callExpr = 'uate.default';
    var templateStr = String(template);

    var literalPortions = [], substitutions = [];
    (function(s) {
      var inLP = true, stack = [], literalPortion = '', tokens = '';
      while (s.length) {
        var seen = s.substring(0, 2) === '${' ? '${' : s.charAt(0);
        s = s.substring(seen.length);
        if (inLP) {
          if (seen === '${') {
            literalPortions.push(literalPortion); literalPortion = '';
            inLP = false;
            stack.push(true);
          } else {
            literalPortion += seen;
          }
        } else if (seen === '{') {
          tokens += '{';
          stack.push(false);
        } else if (seen === '}') {
          if (!stack.length) {
            continue;
          } else if (stack.pop()) {
            substitutions.push(tokens); tokens = '';
            inLP = true;
          } else {
            tokens += '}';
          }
        } else {
          tokens += seen;
        }
      }
      literalPortions.push(literalPortion);
    }(templateStr));

    return callExpr + '(uate.uncook(' + JSON.stringify(literalPortions) + ')' +
      (substitutions.length ? ',' + substitutions.join(',') : '') + ')';
  }

  uate.uncook = function(cooked) {
    function escapeString(s) {
      return String(s).replace(/[^\x20-\x5b\x5d-\x7e]/g, function(c) {
        switch (c) {
        case '\\': return '\\\\';
        case '\b': return '\\b';
        case '\f': return '\\f';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '\t': return '\\t';
        default:
          var cc = c.charCodeAt(0);
          if (cc < 0x80) return '\\x' + ('00' + cc.toString(16)).slice(-2);
          return '\\u' + ('0000' + cc.toString(16)).slice(-4);
        }
      });
    }
    cooked.raw = cooked.map(escapeString);
    return cooked;
  };

  uate.default = function(callSite /*, ...substitutions*/) {
    var substitutions = [].slice.call(arguments, 1);

    var cooked = Object(callSite);
    var literalSegments = cooked["length"]|0;
    if (literalSegments <= 0) return "";
    var stringElements = [];
    var nextIndex = 0;
    while (true) {
      var nextSeg = String(cooked[nextIndex]);
      stringElements.push(nextSeg);
      if (nextIndex + 1 === literalSegments)
        return stringElements.join('');
      var nextSub = String(substitutions[nextIndex]);
      stringElements.push(nextSub);
      nextIndex = nextIndex + 1;
    }
  };

  function halfbaked(callSite /*, ...substitutions*/) {
    var substitutions = [].slice.call(arguments, 1);

    var cooked = Object(callSite);
    var raw = cooked["raw"];
    var literalSegments = raw["length"]|0;
    if (literalSegments <= 0) return "";
    var stringElements = [];
    var nextIndex = 0;
    while (true) {
      var nextSeg = String(raw[nextIndex]);
      stringElements.push(nextSeg);
      if (nextIndex + 1 === literalSegments)
        return stringElements.join('');
      var nextSub = String(substitutions[nextIndex]);
      stringElements.push(nextSub);
      nextIndex = nextIndex + 1;
    }
  }

  function unsafehtml(callSite /*, ...substitutions*/) {
    var substitutions = [].slice.call(arguments, 1);

    function escapeHTML(text) {
      return text.replace(/[&<>"]/g, function(c) {
        switch (c) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "\"": return "&quot;";
        default: return c;
        }
      });
    }

    var cooked = Object(callSite);
    var literalSegments = cooked["length"]|0;
    if (literalSegments <= 0) return "";
    var stringElements = [];
    var nextIndex = 0;
    while (true) {
      var nextSeg = String(cooked[nextIndex]);
      stringElements.push(nextSeg);
      if (nextIndex + 1 === literalSegments)
        return stringElements.join('');
      var nextSub = String(substitutions[nextIndex]);
      stringElements.push(escapeHTML(nextSub));
      nextIndex = nextIndex + 1;
    }
  }

  global.uate = uate;
  global.halfbaked = halfbaked;
  global.unsafehtml = unsafehtml;

}(this));

// ------------------------------------------------------------
// Tests
// ------------------------------------------------------------

function assert(x) { if (!x) throw new Error("assertion failed"); }
function equal(a, b) {
  if (a !== b) throw new Error("assertion failed: " + a + " !== " + b);
}

(function() {
  var a = 1;
  var b = 2;
  equal( eval(uate("${a} + ${b} = ${a + b}")), "1 + 2 = 3" );

  function tag(strings /*, ...values*/) {
    var values = [].slice.call(arguments, 1);
    assert(strings[0] === 'a');
    assert(strings[1] === 'b');
    assert(values[0] === 42);
    return 'whatever';
  }

  equal( eval(uate(tag, "a${42}b")), "whatever" );

  equal( eval(uate(halfbaked, "a\n${42}b")), "a\\n42b" );
}());

(function() {
  var o = { p: function() { return "pass"; } };
  equal( eval(uate('o.p', "a${42}b")), "pass" );
}());

(function() {
  var naughty = "<script>hack(\"foo\");</script>";

  equal(
    eval(uate(unsafehtml, "<p>${naughty}</p>")),
    "<p>&lt;script&gt;hack(&quot;foo&quot;);&lt;/script&gt;</p>"
  );
}());