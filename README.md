uate - ES5 "Tagged Template Strings"
------------------------------------
(Pronounced "you ate" as in "evaluate"...)

```js
var a = 1, b = 2; eval(uate( "${a} + ${b} = ${a + b}" )); // "1 + 2 = 3"
```

### Usage
```js
eval(uate( template ))
```
```js
eval(uate( tag, template ))
```

`template` must be a string containing zero or more `${expr}` clauses which
are evaluated in the local scope.

`tag` is optional, and may either be a named function in scope or a string
containing an expression that in the local scope will yield a function e.g.
`'console.log'`. The function is called as `tag(strings, ...substitutions)`.

The built-in `unsafehtml` function does basic &<>"' escapes of substutions.

The built-in `halfbaked` function yields escaped strings.

### Examples
```js
var a = 1, b = 2; eval(uate( "${a} + ${b} = ${a + b}" )); // "1 + 2 = 3"

eval(uate( tag, "a${ 42 }b" )); // whatever tag wants

eval(uate( halfbaked, "a\n${42}b" )); // "a\\n42b"

eval(uate( unsafehtml, "<p>${untrusted_data}</p>" )); // ampersands galore
```

### Tag Functions
A trivial tag function has this form:
```js
function tag(strings /*, ...substitutions*/) {
  var substitutions = [].slice.call(arguments, 1);

  var result = strings[0];
  for (var i = 0; i < substitutions.length; ++i) {
    result += substitutions[i];
    result += strings[i + 1];
  }
  return result;
}
```
Although it is not very useful in this ES5 hack, `strings.raw` is
another array containing escaped versions of the strings.

### Inspiration
ES6 Tagged String Templates, designed by Mike Samuel, et. al.

In ES6 you can write:
```
var a = 1, b = 2; `${a} + ${b} = ${a + b}`; // "1 + 2 = 3"

tag`a${ 42 }b`; // whatever tag wants

String.raw`a\n${42}b`; // "a\\n42b"

safehtml`<p>${untrusted_data}</p>`; // ampersands galore, and more
```
While it's not obvious in these examples, in ES6 the tag function
is able to access the "raw" (unescaped) string fragments which
allows it to implement domain specific languages using its own
rich syntax. This ES5 version is just a toy.

### References
* http://tc39wiki.calculist.org/es6/template-strings/
* http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts
* http://wiki.ecmascript.org/doku.php?id=harmony:quasis

### Trivia
Call without eval() to understand how it works.

Here's a smaller (but less capable) version that fits in a tweet:

```js
function uate(s){return(''+s).split(/\${(.*?)}/).map(function(p,i){
    return(i%2)?'('+p+')':JSON.stringify(p);}).join('+');}
```
