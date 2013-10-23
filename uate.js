(function(global) {

  function parse(s) {
    var literalPortions = [], substitutions = [];

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

    return [literalPortions, substitutions];
  }

  function memoize(f) {
    var cache = Object.create(null);
    return function(arg) {
      if (arg in cache) return cache[arg];
      return cache[arg] = f(arg);
    };
  }

  parse = memoize(parse);

  function functionName(f) {
    if (f === halfbaked) return 'halfbaked';
    if (f === unsafehtml) return 'unsafehtml';
    if ('name' in f) return f.name;
    return String(f).replace(/^function (.*)\([\s\S]*$/, '$1');
  }

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
    cooked['raw'] = cooked.map(escapeString);
    return cooked;
  };

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

  function unsafehtml(callSite /*, ...substitutions*/) {
    var substitutions = [].slice.call(arguments, 1);

    function escapeHTML(text) {
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
    }

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
      stringElements.push(escapeHTML(nextSub));
      nextIndex = nextIndex + 1;
    }
  }

  global['uate'] = uate;
  global['halfbaked'] = halfbaked;
  global['unsafehtml'] = unsafehtml;

}(this));
