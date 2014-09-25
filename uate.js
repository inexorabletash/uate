(function(global) {

  function memoize(f) {
    var cache = Object.create(null);
    return function() {
      var key = JSON.stringify([].slice.call(arguments));
      return (key in cache) ? cache[key] : cache[key] = f.apply(this, arguments);
    };
  }

  // Parser for template strings.
  var parse = memoize(function(s) {
    var literalPortions = [], substitutions = [];

    var inLP = true, stack = [], literalPortion = '', tokens = '';
    while (s.length) {
      var seen = s.substring(0, 2) === '${' ? '${' : s.charAt(0);
      s = s.substring(seen.length);
      if (seen === '\\') {
        seen = s.substring(0, 1);
        s = s.substring(1);
      }
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

    return [literalPortions, substitutions];
  });

  function functionName(f) {
    if (f === halfbaked) return 'halfbaked';
    if (f === html) return 'html';
    if (f === uri) return 'uri';
    if ('name' in f) return f.name;
    return String(f).replace(/^function (.*)\([\s\S]*$/, '$1');
  }

  // The magic happens here. This returns an eval()-ready string that
  // performs the substitution using bindings from the local scope.
  function uate(a, b) {
    var tag = b === undefined ? undefined : a,
        template = b === undefined ? a : b;
    if (typeof tag === 'function')
      var callExpr = functionName(tag);
    else if (tag !== undefined)
      callExpr = String(tag);
    else
      callExpr = 'uate.default';
    var templateStr = String(template);

    var parsed = parse(templateStr);
    var literalPortions = parsed[0], substitutions = parsed[1];

    return callExpr + '(uate.uncook(' + JSON.stringify(literalPortions) + ')' +
      (substitutions.length ? ',' + substitutions.join(',') : '') + ')';
  }

  // Helper function that approximates a 'raw' array of literal portions.
  // A call to this is returned as part of the expression to eval().
  uate['uncook'] = function(cooked) {
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
    return Object.freeze(Object.defineProperty(
      cooked, 'raw', {value: cooked.map(escapeString)}));
  };

  // The default template function.
  uate['default'] = function(callSite /*, ...substitutions*/) {
    var substitutions = [].slice.call(arguments, 1);

    var cooked = Object(callSite);
    var literalSegments = cooked.length|0;
    if (literalSegments <= 0) return '';
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

  // Sample template function: like ES6's String.raw
  function halfbaked(callSite /*, ...substitutions*/) {
    var substitutions = [].slice.call(arguments, 1);

    var cooked = Object(callSite);
    var raw = cooked['raw'];
    var literalSegments = raw.length|0;
    if (literalSegments <= 0) return '';
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

  // Helper for simple template functions that just transform substitutions.
  function apply(f) {
    return function(callSite /*, ...substitutions*/) {
      var substitutions = [].slice.call(arguments, 1);

      var cooked = Object(callSite);
      var literalSegments = cooked.length|0;
      if (literalSegments <= 0) return '';
      var stringElements = [];
      var nextIndex = 0;
      while (true) {
        var nextSeg = String(cooked[nextIndex]);
        stringElements.push(nextSeg);
        if (nextIndex + 1 === literalSegments)
          return stringElements.join('');
        var nextSub = String(substitutions[nextIndex]);
        stringElements.push(f(nextSub));
        nextIndex = nextIndex + 1;
      }
    };
  }

  // Sample template function: HTML escaping of substitutions.
  var html = apply(function escapeHTML(text) {
    return text.replace(/[&<>"']/g, function(c) {
      switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
      }
    });
  });

  // Sample template function: URI encoding of substitutions.
  var uri = apply(encodeURIComponent);

  global['uate'] = uate;
  global['halfbaked'] = halfbaked;
  global['html'] = html;
  global['uri'] = uri;

}(this));
