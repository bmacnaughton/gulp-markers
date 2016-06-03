'use strict';

//
// this module tests the fs level stream and buffer processing that underlie
// gulp file streams.
//

var Markers = require('..');
var fs = require('fs');
var path = require('path');
var File = require('vinyl');
var should = require('should');
var assert = require('assert');
var concatStream = require('concat-stream');

// run a buffer/stream-independent test
runCoreTest();

// run a suite of tests for buffers and streams
runTests('buffer');
runTests('stream');



var markerDefinitions = [
    {
        // a simple replacement of the marker.
        tag: 'html-copyright',
        re: '<!-- insert:html-copyright:(\\d{4}) -->',
        replace: function (context, match, startYear) {
            var year = new Date().getFullYear();
            return '<!-- Copyright BAM ' + startYear + '-' + year + ' -->';
        },
        opts: {data: {expected: {files: 1, matches: 1}}}
    }, {
        tag: 'html-copyright-via-regex',
        re: new RegExp('<!-- insert:html-copyright-via-regex:(\\d{4}) -->'),
        replace: function (context, match, startYear) {
            var year = new Date().getFullYear();
            return '<!-- Copyright BAM ' + startYear + '-' + year + ' -->';
        },
        opts: {data: {expected: {files: 1, matches: 1}}}
    }, {
        // insert a single item using a string replacement.
        tag: 'html-block-string-css',
        //    1     2        3                                     x          x        4      5x       x
        re: '(\\n?)([ \\t]*)(<!-- @begin:html-block-string-css -->(?:[ \\t]*)(?:\\n?))([^]*?)((?:\\n?)(?:[ \\t]*)<!-- @end:html-block-string-css -->)',
        replace: '$1$2$3$2<link rel="stylesheet" href="css/combined.css">$5',
        opts: {data: {expected: {files: 1, matches: 1}}}
    }, {
        // insert multiple items using a replacement function.
        tag: 'html-block-func-css',
        //    1     2        3                                   x          x        4      5x       x
        re: '(\\n?)([ \\t]*)(<!-- @begin:html-block-func-css -->(?:[ \\t]*)(?:\\n?))([^]*?)((?:\\n?)(?:[ \\t]*)<!-- @end:html-block-func-css -->)',
        replace: function(context, match, newline, whitespace, begin, body, end) {
            var lines = ['dynamic/path-one.css', 'dynamic/path-two.css'].map(function(f) {
                return whitespace + '<link rel="stylesheet" href="' + f + '">';
            });
            // the next line leaves the markers in place; it's easy enough to take them out.
            return newline + whitespace + begin + lines.join('\n') + end;
        },
        opts: {data: {expected: {files: 1, matches: 1}}}
    }, {
        tag: 'framework-js',
        //     1       2           3           4     5
        re: '^([ \t]*)(<!-- begin:(wf_js) -->)([^]*)(<!-- end:wf_js -->)',
        replace: htmlScriptReplacement,
    }, {
        tag: 'framework-js-vendor',
        //     1       2           3            4     5
        re: '^([ \t]*)(<!-- begin:(vendor) -->)([^]*)(<!-- end:vendor -->)',
        replace: htmlScriptReplacement
    }, {
        tag: 'html-design-js',
        //     1        2                     3     4
        re: '^([ \t]*)(<!-- begin:design -->)([^]*)(<!-- end:design -->)',
        replace: function(context, match, whitespace, begin, body, end) {
            /*
            var relpath = path.relative(paths.wd_html.dest[target], paths.wd_js.dest[target]);

            var htmlfilename = path.basename(context.file.path);
            var designScripts = alldesigns[htmlfilename].designScript;

            var lines = designScripts.map(function(f) {
                f = path.basename(f);
                return whitespace + '<script src="' + path.join(relpath, f) + '"></script>';
            });
            return whitespace + begin + '\n' + lines.join('\n') + '\n' + whitespace + end;
            // */
            return '\nTBD\n';
        },
    }, {
        tag: 'js-markers',
        //     1                  2              x   3
        re: '^(\\s*)\\/\\/\\+\\+ ([A-Za-z0-9-]+)(?::(.+))* --\\/\\/\\s*$',
        replace: jsMarkerReplacement
    }, {
        tag: 'js-bracketed',
        //     1                         2              x   3               4
        re: '(\\s*)\\/\\/\\+\\+ @begin:([A-Za-z0-9-]+)(?::(\\S+))* --\\/\\/([^]*?)\\/\\/\\+\\+ @end:\\2 --\\/\\/',
        // 1: whitespace
        // 2: task name
        // 3: selector
        // 4: body
        replace: jsBracketedReplacement
    }
];

var markerDefinitionsCount = markerDefinitions.length;

function htmlScriptReplacement(context, match, whitespace, begin, id, body, end) {
    /*
    // TODO change .HTML files so this map can be removed
    //var map = {wf_js: "framework-js", vendor: "framework-js-vendor"};
    var p = makeTaskPath(context.tag);
    //console.log('xxx', {match, whitespace, begin, id, body, end});
    var relpath = path.relative(paths.wd_html.dest[target], paths[p].dest[target]);

    var lines = filenames.get(context.tag).map(function(f) {
        return whitespace + '<script src="' + path.join(relpath, f) + '"></script>';
    });
    return whitespace + begin + "\n" + lines.join("\n") + "\n" + whitespace + end;
    // */
    return '\nTBD\n';
}

function jsMarkerReplacement(context, match, whitespace, task, selector) {
    /*
    // TODO kind of kludgy to not reference scripts directory - maybe
    // remove that from PHP code so I can just remove root? or calculate
    // relative paths like HTML replace does?
    var taskpath = makeTaskPath(task);
    if (!paths[taskpath]) {
        throw "jsMarkerReplacement can't find task name: '" + task + "'";
    }
    taskpath = paths[taskpath].dest[target];
    var li = taskpath.lastIndexOf('scripts/');
    taskpath = taskpath.substring(li + 'scripts/'.length);
    // if no selector it matches everything
    if (!selector) {
        selector = '.';
    }
    var taskfiles = filenames.get(task);
    var selected = taskfiles.filter(f => f.search(new RegExp(selector)) > -1);
    var replacement = match + '\n' + whitespace + "'" + taskpath;
    return replacement + selected.join("',\n" + whitespace + "'" + taskpath) + "',";
    // */
    return '\nTBD\n';
}

function jsBracketedReplacement(context, match, whitespace, task, selector, body) {
    /*
    var taskpath = makeTaskPath(task);
    if (!paths[taskpath]) {
        throw "jsBracketedReplacement can't find task name: '" + task + "'";
    }
    taskpath = paths[taskpath].dest[target];
    var li = taskpath.lastIndexOf('scripts/');
    taskpath = taskpath.substring(li + 'scripts/'.length);

    // if no selector it matches everything
    if (!selector) {
        selector = '.';
    }
    // the match isn't used here because it spans the body being replaced.
    // TODO extend RE so it captures prefix and suffix to body, not body.
    var taskfiles = filenames.get(task);
    var selected = taskfiles.filter(f => f.search(new RegExp(selector)) > -1);
    var replacement = whitespace + "'" + taskpath;
    return replacement + selected.join("',\n" + whitespace + "'" + taskpath) + "',";
    // */
    return '\nTBD\n'
}

// not cloning the objects but getting a new array.
//var allMarkerDefinitions = markerDefinitions.map(m => m);

function bufferCompare(fixture, expected, transform, done, filename) {
    transform.once('data', function (file) {
        // write the file if filename is supplied
        var p = new Promise(function(resolve, reject) {
            if (filename) {
                fs.writeFile(filename, file.contents, err => err ? reject() : resolve());
            } else {
                resolve();
            }
        });

        (file.isBuffer()).should.be.ok('file must be a buffer');
        assert.strictEqual(String(file.contents), expected);
        // done when any IO has completed
        p.then(done);
    })

    .end(new File({
        base: path.resolve('www'),
        path: path.resolve('www', 'pages', 'index.html'),
        contents: fixture
    }));
}

function streamCompare(fixture, expected, transform, done, filename) {
    var fakeFile = new File({
        base: path.resolve('www'),
        path: path.resolve('www', 'pages', 'index.html'),
        contents: fixture
    });

    transform.write(fakeFile);

    transform.once('data', function (file) {
        // write the data if filename is supplied
        var filedata;
        function writefile(resolve, reject) {
            if (filename) {
                fs.writeFile(filename, filedata, err => err ? reject() : resolve());
            } else {
                resolve();
            }
        };

        (file.isStream()).should.be.ok('file must be a stream');

        file.contents.pipe(concatStream({encoding: 'string'}, function (data) {
            filedata = data;
            var p = new Promise(writefile);
            should.equal(data, expected, 'stream data should equal expected');
            p.then(done);
        }));
    });
}

//
// run core tests to make sure the constructor works and markers are added correctly
//
function runCoreTest() {
    var markers, markerTagsDefined;

    describe('Marker consistency checks', function() {

        before(function() {
            markers = new Markers();
            markerTagsDefined = markerDefinitions.map(m => m.tag);

            // add the markers
            markerDefinitions.forEach(m => markers.addMarker(m));

            // make sure that a marker can be added as individual arguments
            markers.addMarker(
                'html-copyright-non-object',
                new RegExp('<!-- insert:html-copyright-non-object:(\\d{4}) -->'),
                function (context, match, startYear) {
                    var year = new Date().getFullYear();
                    return '<!-- Copyright BAM ' + startYear + '-' + year + ' -->';
                }
            );
            // add that tag to the array
            markerTagsDefined.push('html-copyright-non-object');

        });

        it('should have the right number of markers', function() {
            var markerTags = markers.getMarkerTags();
            (markerTags.length).should.equal(markerTagsDefined.length);
        });

        it('should have the right tags', function() {
            var markerTags = markers.getMarkerTags();
            markerTags.should.containDeep(markerTagsDefined);
            markerTagsDefined.should.containDeep(markerTags);
        });

    });
}

//
// run a suite of tests.
//
function runTests(type) {
    function errorHandler(filename) {
        return fs.createReadStream(filename).on('error', err => {throw err});
    }

    var compare = ({buffer: bufferCompare, stream: streamCompare})[type];
    var reader = ({buffer: fs.readFileSync, stream: errorHandler})[type];
    var fixtureFile = path.join('test', 'fixtures', 'fixture.html');

    describe(type + ' mode - raw file', function () {
        it('should replace blocks', function (done) {

            var markers = new Markers();

            //
            // add the markers
            //
            markerDefinitions.forEach(m => markers.addMarker(m));

            // make sure that a marker can be added as individual arguments
            markers.addMarker(
                'html-copyright-non-object',
                new RegExp('<!-- insert:html-copyright-non-object:(\\d{4}) -->'),
                function (context, match, startYear) {
                    var year = new Date().getFullYear();
                    return '<!-- Copyright BAM ' + startYear + '-' + year + ' -->';
                }
            );

            // find the markers. nothing should change.
            var fixture = reader(fixtureFile);
            var unchanged = fs.readFileSync(fixtureFile, 'utf8');
            var transform = markers.findMarkers();
            var p = new Promise(function(resolve, reject) {
                compare(fixture, unchanged, transform, () => resolve())
            });

            // when finding is done do replacing
            p.then(function() {
                var fixture = reader(fixtureFile);
                var expected = fs.readFileSync(path.join('test', 'expected', 'expected.html'), 'utf8');
                var transform = markers.replaceMarkers();
                var writefile = path.join('./test/output/', type + '-output.html');
                compare(fixture, expected, transform, done, writefile);
            });
        });

        it('should do nothing when no markers have been added', function (done) {

            var markers = new Markers();

            var fixture = reader(fixtureFile);
            var expected = fs.readFileSync(fixtureFile, 'utf8');

            // find the markers. nothing should change.
            var transform = markers.findMarkers();
            var p = new Promise(function(resolve, reject) {
                compare(fixture, expected, transform, () => resolve());
            });

            var transform = markers.replaceMarkers();
            compare(fixture, expected, transform, done);
        });

        it('should find the correct files and markers', function(done) {
            var debug = null;
            if (false && type === 'stream') {
                debug = d => console.log('DEBUG', d);
            }

            var markers = new Markers();
            markerDefinitions.forEach(m => markers.addMarker(m));

            // find the markers. no real need to compare but it's easier
            // than writing functions that just consume with the transform.
            var fixture = reader(fixtureFile);
            var expected = fs.readFileSync(fixtureFile, 'utf8');
            var transform = markers.findMarkers({debug: debug});
            var p = new Promise(function(resolve, reject) {
                compare(fixture, expected, transform, () => resolve())
            });

            // when finding is done evaluate the results
            p.then(function() {
                var tags = markers.getMarkerTags();
                (tags.length).should.eql(markerDefinitions.length);
                tags.forEach(function(t) {
                    var marker = markers.getMarker(t);
                    var files = markers.getFiles(t);
                    //var matches = markers.getMatches(t, f);
                    if (marker.data.expected && marker.data.expected.files) {
                        (files.length).should.eql(marker.data.expected.files, 'for ' + t);
                    }
                });

                done();
            });
        });

    });

}

