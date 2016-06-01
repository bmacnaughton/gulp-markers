'use strict';

var Markers = require('..');
var fs = require('fs');
var path = require('path');
var File = require('vinyl');
var should = require('should');
var assert = require('assert');
//var gulp = require('gulp');
//var rename = require('gulp-rename');

function compare(testdata, expected, stream, done, filename) {
    stream.once('data', function (file) {
        // write the file is requested
        var p = new Promise(function(resolve, reject) {
            if (filename) {
                fs.writeFile(filename, file.contents, err => err ? reject() : resolve());
            } else {
                resolve();
            }
        });

        assert(file.isBuffer());
        assert.strictEqual(String(file.contents), expected);
        // done when any IO has completed
        p.then(done);
    })

    .end(new File({
        base: path.resolve('www'),
        path: path.resolve('www', 'pages', 'index.html'),
        contents: testdata
    }));
}

describe('Buffer mode - raw file', function () {
    it('should replace blocks', function (done) {

        var markers = new Markers();

        var markerDefinitions = [
        {
            // a simple replacement of the marker.
            tag: 'html-copyright',
            re: '<!-- insert:html-copyright:(\\d{4}) -->',
            replace: function (context, match, startYear) {
                var year = new Date().getFullYear();
                return '<!-- Copyright BAM ' + startYear + '-' + year + ' -->';
            }
        }, {
            tag: 'html-copyright-via-regex',
            re: new RegExp('<!-- insert:html-copyright-via-regex:(\\d{4}) -->'),
            replace: function (context, match, startYear) {
                var year = new Date().getFullYear();
                return '<!-- Copyright BAM ' + startYear + '-' + year + ' -->';
            }
        }, {
            // insert a single item using a string replacement.
            tag: 'html-block-string-css',
            //    1     2        3                                     x          x        4      5x       x
            re: '(\\n?)([ \\t]*)(<!-- @begin:html-block-string-css -->(?:[ \\t]*)(?:\\n?))([^]*?)((?:\\n?)(?:[ \\t]*)<!-- @end:html-block-string-css -->)',
            replace: '$1$2$3$2<link rel="stylesheet" href="css/combined.css">$5'
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
            }
        }, {
            tag: 'framework-js',
            //     1       2           3           4     5
            re: '^([ \t]*)(<!-- begin:(wf_js) -->)([^]*)(<!-- end:wf_js -->)',
            replace: htmlScriptReplacement
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

        //
        // add the previous defined markers
        //
        markerDefinitions.forEach(m => markers.addMarker(m));

        var fixture = fs.readFileSync(path.join('test', 'fixtures', 'fixture.html'));
        var expected = fs.readFileSync(path.join('test', 'expected', 'expected.html'), 'utf8');

        var stream = markers.replaceMarkers();

        compare(fixture, expected, stream, done, './test/output/buffer-output.html');
    });
});

