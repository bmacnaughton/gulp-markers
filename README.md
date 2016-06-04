# gulp-markers [![Travis][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url]


## What does gulp-markers do? ##

`gulp-markers` uses regular expressions to find markers in gulp file streams and transform them. The markers are defined by regular expressions and transforms are specified by a string or function. Both are defined by the user. `gulp-markers` is just a framework; it does nothing more.

## Usage

#### Install

Install with npm using either the --save or --save-dev option depending on your application:
```shell
npm install --save gulp-markers
```

#### Getting started

Put a marker in a file. This example uses a marker in an HTML file. I usually make markers look like comments for the file type so that editors don't complain about them. But it's not a requirement - you define them.
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

With a small tweak to the regex and the replacement function this can handle insertion of multiple categories of script files. Change the regex to capture some groups, most importantly the text following "@insert:". That can be used to determine what js files to insert. It is also capturing whitespace so it can align the output. The patterns captured by the groups appear after the first two arguments, context and match.

```javascript
var markers = new Markers();

var jsFiles = {
    "js-vendor": ['jquery.min.js', 'paper-core.min.js'],
    "js-globals": ['main.js'],
    "js-application": ['application.js', 'support.js']
};

markers.addMarker({
    tag: 'js-insertions',
    //               1    2                    3
    re: /(\n?)([ \t]*)<!-- @insert:([A-Za-z0-9-]+) -->/,
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

One more tweak - use `gulp-filenames` to capture the filenames after all task-specific build options have been applied. I usually set `optConcat` and `optMinify` based on the target being built. So we'll just change the replace function to fetch the filenames collected rather than using a hardcoded array. That way it will insert the separate files or the concatenated single file either of which may have been minified and renamed and the inserted files will be correct for any target configuration.

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

## gulp-markers API

<h4><b><code>Markers([markers])</code></b></h4>

Constructor for markers. It has an optional argument - an array of marker objects as described below.

<h4><b><code>.addMarker(tag, re, replace [, opts])</code></b></h4>

This method adds a marker to the instance. There are two signatures: individual arguments and an object form. In the object form each property of the object is identified by the names below.

##### tag

The tag argument identifies this marker. It will be passed to the replace function as part of the context object.

##### re

The re argument is a RegExp object or a string that will be used to create a RegExp object. This regex is used to find markers in files. Groups defined in the regex will be passed to the replace function. The 'g' and 'm' flags will always be added for String.match() and RegExp.exec() calls.

##### replace

The replace argument is either a string or a function. A string will be used directly in a String.replace() function call. A function will be wrapped so the first argument is a context object, followed by the regular String.replace() function arguments.

The context object contains a tag property - the value is the tag being executed, a data property - the data object specified in the opts property or {} if none, and a file property - the vinyl file properties cwd, base, and path. The context can be used as the replace function chooses.

##### opts

The opts argument is optional. If present, the options are applied to this marker. The only option currently implemented is `data`. It allows the caller to store any arbitrary data so that it is available to the replace function.

<h4><b><code>.addMarkers(array)</code></b></h4>

addMarkers has one argument - an array of objects, each defining a marker as described above.

<h4><b><code>.findMarkers(opts)</code></b></h4>

findMarkers returns a transform stream. No opts are currently implemented. The filenames in which the markers were found can be fetched.

<h4><b><code>.replaceMarkers(opts)</code></b></h4>

replaceMarkers returns a transform stream. No opts are currently implemented. If you wish to replace the markers without first finding them just use replaceMarkers without first using findMarkers. replaceMarkers may be invoked multiple times.

<h4><b><code>.getMarkerTags()</code></b></h4>

getMarkerTags returns an array filled with all marker tags.

<h4><b><code>.getFilesForMarker(tag)</code></b></h4>

returns an array of filenames in which the marker defined by `tag` was found. The filenames are in the form returned by `path.resolve()`.

## A little background

### Why did I create gulp-markers? ##

There are many gulp replace solutions that already exist, so why did I end up creating this one? Simply because I wanted one framework to handle all the different use cases I encountered.

I used a number of the many gulp-replace solutions that already exist and yet found myself writing custom solutions to handle various corner cases. I found that many of the things I wanted to do required jumping through hoops to work with existing solutions. So when I started to implement yet another solution I decided to try to implement a relatively generic framework. The goal was to expose a basic API that could be used to handle almost any special case.

### Why use gulp-markers? ##

`gulp-markers` replaces all of the previous tools I was using; it might be able to do the same for you.

I started using `gulp-html-replace` and found it quite useful for many cases, as well as being a very nicely constructed package with excellent testing. But I had situations where I wanted to insert dynamically configured filenames (optionally concatenated and minified) into HTML files and PHP files. And I wanted to encode additional information into the markers so that the insertion functions could be as general as possible.

I now use `gulp-markers` to insert version numbers and licenses, update dates in copyright notices, insert css files, insert JavaScript files, and insert dynamic lists of files captured by gulp-filenames. All into HTML, JavaScript, Python, and PHP files.

The core code for the Transform streams is taken from `gulp-html-replace` so the logic is better tested than it otherwise would be.

### Why not use gulp-markers? ##

You have to write your own regex expressions and replacement functions. It's not as automatic for many common use cases as more specialized tools like `gulp-html-replace`.

Though I use it for my projects, it's received very little real-world use; it's very early. It's the first open-source project of mine that I have intended to be used by others.

The documentation is skeletal.

You don't want to run node 4.1 or greater. If this is an issue for many people I'll work on making it backward compatible.

### Design goals for gulp-markers ###

1. Make no assumptions about marker formats.

    This allows markers to be inserted in any type of file and for them to encode any information required by the use case. The caller specifies the regular expression that will be used to recognize markers.

2. Make no assumption that the substitution is known at marker-recognition time.

    Recognizing markers and performing transforms are independent functions. Transforms should be able to be performed at marker recognition time but there should be no requirement to do so.

3. Allow insertion or replacement of existing content.

    Markers are defined by you so they can be either a single marker or two markers that bracket content to be replaced. This is satisfied by allowing the users to define the patterns used for marker recognition in combination with a replacement function.

### Special thanks ###

To Vladimir Kucherenko for `gulp-html-replace`, my inspiration and model for `gulp-markers`.


[travis-url]: https://travis-ci.org/bmacnaughton/gulp-markers
[travis-image]: https://travis-ci.org/bmacnaughton/gulp-markers.svg
[coveralls-url]: https://coveralls.io/github/bmacnaughton/gulp-markers?branch=master
[coveralls-image]: https://coveralls.io/repos/github/bmacnaughton/gulp-markers/badge.svg?branch=master
