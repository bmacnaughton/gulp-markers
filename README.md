# gulp-markers [![Travis][travis-image]][travis-url] [![AppVeyor][appveyor-image]][appveyor-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependency Status][depstat-image]][depstat-url]

## What does gulp-markers do? ##

`gulp-markers` finds and/or replaces patterns (markers) in any kind of source file. It is a thin wrapper around JavaScript's RegExp function. It can be used to insert specific `<script>` tags, update copyright notices, insert headers, remove inline test code, i.e., anything that can be done with regular expressions. And because it uses regular expressions to find and transform markers in gulp file streams it works on any type of source file.

You define your own markers using JavaScript regular expressions; you specify your transforms with a string or function (like JavaScript's  `String.prototype.replace()`). `gulp-markers` adds a context argument to the replace function so it can be made very generic. Think of `gulp-markers` as `RegExp.replace()` for the gulp file streams.

## Table of contents
* [Getting Started with Examples](#getting-started)
* [API](#gulp-markers-api)
* [Background](#a-little-background)


## Usage

#### Install

Install with npm using either the --save or --save-dev option depending on your application:
```shell
npm install --save gulp-markers
```

#### Getting started

Put a marker in a file. This example uses a marker in an HTML file. I usually make markers look like comments for the file type so editors don't complain about them. But it's not a requirement - you define your markers.
```html
<!-- @insert:js-vendor -->
```

Set up markers in your gulpfile. Create an instance then add markers to it.
```javascript
Markers = require('gulp-markers');

var markers = new Markers();

markers.addMarker({
    tag: 'js-insertions',
    re: /<!-- @insert:js-vendor -->/,
    replace: function(context, match) {
        var vendorJSFiles = ['jquery.min.js', 'paper-core.min.js'];
        var lines = vendorJSFiles.map(f => '<script src="' + f + '"></script>');
        return lines.join('\n');
    }
});
```

Then replace the markers in a gulp task.
```javascript
gulp.task('html-file-task', function() {
    return gulp.src('my-html-file-path')
        .pipe(htmlhint())
        .pipe(htmlhint.reporter())
        .pipe(markers.replaceMarkers())
        .pipe(gulp.dest('my-dest-path'));
});
```

#### Making the marker replace function more generic

With a small tweak to the regex and the replacement function this can handle insertion of multiple categories of script files. Change the regex to capture some groups, most importantly the text following "@insert:". That can be used to determine what js files to insert. It is also capturing whitespace so it can align the output. The patterns captured by the groups appear after the first two arguments, context and match. (The arguments following context correspond directly to the those passed to RegExp.replace. See API below for more details.)

```javascript
var markers = new Markers();

var jsFiles = {
    "js-vendor": ['jquery.min.js', 'paper-core.min.js'],
    "js-globals": ['main.js'],
    "js-application": ['application.js', 'support.js']
};

markers.addMarker({
    tag: 'js-insertions',
    //    1    2                    3
    re: /(\n?)([ \t]*)<!-- @insert:([A-Za-z0-9-]+) -->/,
    //                                1        2           3
    replace: function(context, match, newline, whitespace, id) {
        if (!jsFiles[id]) {
            // no match so don't change anything
            return match;
        }
        var files = jsFiles[id];
        var lines = files.map(f => whitespace + '<script src="' + f + '"></script>');
        return lines.join('\n');
    }
});

```
#### Adding gulp-filenames into the mix

One more tweak - use [gulp-filenames](https://github.com/johnydays/gulp-filenames) to capture the filenames after all task-specific build options have been applied. I usually set `optConcat` and `optMinify` based on the target being built. So we'll just change the replace function to fetch the filenames collected rather than using a hardcoded array. That way it will insert the separate files or the concatenated single file either of which may have been minified and renamed and the inserted files will be correct for any target configuration.

Here's the new replace function:
```js
replace: function(context, match, newline, whitespace, id) {
    var files = filenames.get(id);
    // do nothing if no replacement
    if (!files.length) {
        return match;
    }
    var lines = files.map(f => whitespace + '<script src="' + f + '"></script>');
    return lines.join('\n');
}
```

And here's the two tasks to use the new marker.
```js
// this task captures the filenames after all options have been applied.
gulp.task('framework-js', function() {
    return gulp.src(framework_files)
        .pipe(gulpif(optConcat, concat(framework_concatname)))
        .pipe(gulpif(optMinify, uglify({preserveComments: 'some'})))
        .pipe(gulpif(optMinify, rename({extname: '.min.js'})))
        .pipe(filenames("framework-js"))
        .pipe(gulp.dest(framework_destination));
});

// run the html task after the previous task completes so the filenames have been captured.
gulp.task('html-file-task', ['framework-js'], function() {
    return gulp.src('my-html-file-path')
        .pipe(htmlhint())
        .pipe(htmlhint.reporter())
        .pipe(markers.replaceMarkers())
        .pipe(gulp.dest('my-dest-path'));
});

```

#### Example of bracketed markers, i.e., a marker with a begin, a body, and an end.

Finally, here's one of the regexes I use to insert JavaScript filenames into PHP source (so PHP can insert script tags for them). The groups are marked by numbers, non-capturing groups with an 'x'. I don't care about keeping the markers after inserting the filenames; if you do then you need to add groups to capture the markers (or reconstruct them using the already captured groups).

```javascript
//    1    2                       3              x   4             5
re: /(\n?)([ \t]*)\/\/\+\+ @begin:([A-Za-z0-9-]+)(?::(\S+))* --\/\/([^]*?)\/\/\+\+ @end:\3 --\/\//,
```

It recognizes markers of the form (where ... represents anything)

```javascript
//++ @begin:dashed-letters[:optional] --//
...
//++ @end:dashed-letters --//
```

The groups:

1. capture whether there is a newline at the beginning of the whitespace.
2. capture whitespace; I don't use \s because it recognizes \n as well.
3. the primary identifier consisting only of letters, numbers, and dashes.
4. an optional sequence of non-whitespace characters following a colon.
5. the body between the begin and end markers.

The optional sequence can be used as a format selector, a regex, a regex selector, etc.


## gulp-markers API

<h4><b><code>Markers([markers])</code></b></h4>

Constructor for markers. It has an optional argument - an array of marker objects as described below.

<h4><b><code>.addMarker(tag, re, replace [, opts])</code></b></h4>
<h4><b><code>.addMarker({tag, re, replace[, opts]})</code></b></h4>

adds a marker to the instance. There are two signatures: individual arguments and an object form. In the object form each property of the object is identified by the property names shown.

##### tag

The tag argument identifies this marker. It will be passed to the replace function as part of the context object. It can also be used to get an array of files in which this marker was found.

##### re

The re argument is a `RegExp` object or a string that will be used to create a `RegExp` object. This regex is used to find markers in files. Groups defined in the regex will be passed to the `replace` function. If the argument is a `RegExp` object only the `source` property is used.

##### replace

The replace argument is either a string or a function. A string will be used directly in a `String.replace()` function call. A function will be wrapped so the first argument is a context object, followed by the regular `String.replace()` function [arguments](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace).

The context object contains the following properties:
- tag -  the tag being executed
- data - the data object specified in the opts property or {} if none
- file - the vinyl file properties cwd, base, and path.

The context can be used as the replace function chooses.

##### opts

The opts argument is optional. If present, the options are applied to this marker. The only option currently implemented is `data`. It allows the caller to store any arbitrary data so it is available to the replace function via the `context` argument.

<h4><b><code>.addMarkers(array)</code></b></h4>

adds an array of markers. Each element is an object that defines a marker as described above.

<h4><b><code>.findMarkers(opts)</code></b></h4>

returns a transform stream. No opts are currently implemented. The filenames in which the markers were found can be fetched using `getFilesForMarker()`.

<h4><b><code>.replaceMarkers(opts)</code></b></h4>

returns a transform stream. No opts are currently implemented. If you wish to replace the markers without first finding them just use `replaceMarkers` without first using `findMarkers`. `replaceMarkers` may be invoked multiple times; it doesn't add any state to the `Marker` object.

<h4><b><code>.getMarkerTags()</code></b></h4>

returns an array filled with all marker tags.

<h4><b><code>.getFilesForMarker(tag)</code></b></h4>

returns an array of filenames in which the marker defined by `tag` was found. The filenames are in the form returned by `path.resolve()`. Note - The `findMarkers` transform must be executed in order to capture the files in which matches occur; `replaceMarkers()` does not yet capture the files.

## A little background

### Why did I create gulp-markers? ##

There are many gulp replace solutions that already exist, so why did I end up creating this one? Simply because I wanted one framework to handle all the different use cases I encountered.

I used a number of the many gulp-replace solutions that already exist and yet found myself writing custom solutions to handle various corner cases. I found that many of the things I wanted to do required jumping through hoops to work with existing solutions. So when I started to implement yet another solution I decided to try to implement a relatively generic framework. The goal was to expose a basic API that could be used to handle almost any special case.

### Why use gulp-markers? ##

`gulp-markers` replaces all of the previous tools I was using; it might be able to do the same for you. It also maps almost directly (there is one additional argument) to the JavaScript string replace function so it is familiar if you have used JavaScript regular expressions.

`gulp-markers` correctly handles both buffers and streams; with streams it reads the entire file so there is no chance of missing a pattern that crosses chunks. The core code is derived from [gulp-html-replace](https://github.com/VFK/gulp-html-replace), with minor modifications to read the entire stream, so the logic is better tested than it otherwise would be.

I started using [gulp-html-replace](https://github.com/VFK/gulp-html-replace) and found it quite useful for many cases, as well as being a very nicely constructed package with excellent testing. But I had situations where I wanted to insert dynamically configured filenames (optionally concatenated and minified) into HTML files and PHP files. And I wanted to encode additional information into the markers so the insertion functions could be as general as possible.

I now use `gulp-markers` to insert version numbers and licenses, update dates in copyright notices, insert css files, insert JavaScript files, and insert dynamic lists of files captured by [gulp-filenames](https://github.com/johnydays/gulp-filenames). All into HTML, JavaScript, Python, and PHP files.

There is now a basic [recipes](./docs/RECIPES.md) document. It wil grow over time. Contributions are welcome.

### Why not use gulp-markers? ##

You have to write your own regex expressions and replacement functions. It's not as automatic for many common use cases as more specialized tools like [gulp-html-replace](https://github.com/VFK/gulp-html-replace).

While no issues have been reported it isn't one of the most popular packages; it hasn't been vetted by wholesale adoption. It's also the first open-source project of mine that I have intended to be used by others.

You don't want to run node 4 or greater. If this is an issue for many people I'll make it backward compatible. The feature I find very convenient is arrow-functions, specifically keeping the lexical context. And it seems time to move past node.js 0.12 and io.js.

### Design goals for gulp-markers ###

1. Make no assumptions about marker formats.

    This allows markers to be inserted in any type of file and for them to encode any information required by the use case. The caller specifies the regular expression that will be used to recognize markers.

2. Make no assumption that the substitution is known at marker-recognition time.

    Recognizing markers and performing transforms are independent functions. Transforms should be able to be performed at marker recognition time but there should be no requirement to do so.

3. Allow insertion or replacement of existing content.

    Markers are defined by you so they can be either a single marker or two markers that bracket content to be replaced. This is satisfied by allowing the users to define the patterns used for marker recognition in combination with a replacement function.

### Special thanks ###

To Vladimir Kucherenko for [gulp-html-replace](https://github.com/VFK/gulp-html-replace), where I started this journey.


[travis-url]: https://travis-ci.org/bmacnaughton/gulp-markers
[travis-image]: https://travis-ci.org/bmacnaughton/gulp-markers.svg
[appveyor-url]: https://ci.appveyor.com/project/bmacnaughton/gulp-markers
[appveyor-image]: https://ci.appveyor.com/api/projects/status/wcnq48a8tpdty4gk?svg=true
[coveralls-url]: https://coveralls.io/github/bmacnaughton/gulp-markers?branch=master
[coveralls-image]: https://coveralls.io/repos/github/bmacnaughton/gulp-markers/badge.svg?branch=master
[depstat-url]: https://david-dm.org/bmacnaughton/gulp-markers
[depstat-image]: https://david-dm.org/bmacnaughton/gulp-markers.svg
