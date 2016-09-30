## Recipes
* [Insert copyright notice](#insert-copyright-notice)
* [Remove unit test](#Remove-unit-test)
* More to come



## Insert copyright notice

This recipe inserts a copyright notice into an HTML file. The copyright notice is updated so it always includes the current year. It's an easy exercise to extend this to insert copyrights into PHP, JavaScript, or files of any type.

The marker in the HTML file:

```html
<!-- insert:html-copyright:2013 -->
```

JavaScript in gulpfile.js (excerpted):

```js
//
// setup in gulpfile. the re: property is a string but could be a RegExp.
//
var copyrightMarker = {
    tag: 'html-copyright',
    re: '<!-- insert:html-copyright:(\\d{4}) -->',
    replace: function (context, match, startYear) {
        var year = new Date().getFullYear();
        var range = '-' + year;
        if (year == startYear) {
            range = '';
        }
        return '<!-- Copyright BAM ' + startYear + range + ' -->';
    }
}

var markers - new Markers();
markers.addMarker(copyrightMarker);

//
// the gulp task
//
gulp.task("html-copyright-insertion", function() {
    return gulp.src("*.html")
        .pipe(markers.replaceMarkers())
        .pipe(gulp.dest("destination"))
});

```

## Remove unit test

I like to implement unit tests at the bottom of modules. It's OK to leave them in during development but I like to take them out when moving to production.

Here's an example module that implements a Fibonacci series via a generator. The unit test, suitable in a nodejs context, is at the bottom.

```js
function* getFibonacciGen(n) {
    var n0 = 0;
    var n1 = 1;

    for (let i = 0; i < n; i++) {
        let num = n0;
        n0 = n1;
        n1 = n1 + num;
        yield num;
    }
}

if (require.main === module) {
    let fibonacci = getFibonacciGen(10);
    let r = fibonacci.next();
    while (!r.done) {
        console.log(r.value);
        r = fibonacci.next();
    }
}
```

I implement a gulp task to remove the unit test in a manner similar to the following. I match specific code but you could insert markers as comments. Note that the replacement string is hardcoded so no function is used.

```js
//
// setup in gulpfile.
//
var unitTestMarker = {
    tag: 'js-unit-test',
    re: /^if \(require\.main === module\) {$[^]*^}$/,
    replace: ''
}

var markers - new Markers();
markers.addMarker(unitTestMarker);

//
// the gulp task
//
gulp.task("js-remove-unit-tests", function() {
    return gulp.src("*.js")
        .pipe(markers.replaceMarkers())
        .pipe(gulp.dest("destination"))
});

```