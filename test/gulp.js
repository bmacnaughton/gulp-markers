var Markers = require('..');
var fs = require('fs');
var path = require('path');
var should = require('should');
var gulp = require('gulp');
var rename = require('gulp-rename');

describe('gulp mode - testing markers', function() {
    var markers, markerDefinitions;
    var tag = 'gulp-bracketed';
    // use the buffered test's output for now
    var src = "./test/output/buffer-output.html";
    var expected = './test/expected/';
    var dest = './test/output/';

    before(function() {
        markers = new Markers();
        markerDefinitions = [
            {
            tag: tag,
            //    1                            2              x   3               4
            //re: '([ \\t]*)\\/\\/\\+\\+ @begin:([A-Za-z0-9-]+)(?::(\\S+))* --\\/\\/([^]*?)\\/\\/\\+\\+ @end:\\2 --\\/\\/',
            //    1                    2                  3           4
            re: '([ \\t]*)<!-- @begin:([A-Za-z0-9-]+)(?::(\\S+))* -->([^]*?)<!-- @end:\\2 -->',
            // 1: whitespace
            // 2: task name
            // 3: selector
            // 4: body
            replace: function(context, match) {return match;}
            }
        ];
        markerDefinitions.forEach(m => markers.addMarker(m));
    });

    it('should find markers with gulp', function (done) {
        gulp.src(src)
            .pipe(markers.findMarkers())
            //.pipe(markers.replaceMarkers())
            .pipe(gulp.dest(dest))
            .on('end', function() {
                done();
            });
    });

    it('should find the right number of files and markers', function() {
        var tags = Object.keys(markers.m);
        should.equal(tags.length, 1, 'verify one tag');
        should.exist(markers.m[tag], 'verify correct tag');
        var files = markers.m[tag].files;
        should.equal(Object.keys(files).length, 1, 'verify one file');
        should.exist(files[path.resolve(src)], 'verify correct file');
        var matchCount = 0;
        // for each file hash count the matches for each regex hash

        Object.keys(files).forEach(function(f) {
            matchCount += files[f].length;
        });
        should.equal(matchCount, 3, 'verify number of matches');
    });

    it('find should not change the file', function() {
        var input = fs.readFileSync(path.resolve(src), 'utf8');
        var output = fs.readFileSync(path.resolve(path.join(dest, path.basename(src))), 'utf8');
        should.strictEqual(input, output, 'the output should not be modified');
    });

    it('should replace markers with gulp', function (done) {
        gulp.src(src)
            //.pipe(markers.findMarkers())
            .pipe(markers.replaceMarkers())
            .pipe(gulp.dest(dest))
            .on('end', function() {
                done();
            });
    });

    it('should not change the file using match as replacement', function() {
        var input = fs.readFileSync(path.resolve(src), 'utf8');
        var output = fs.readFileSync(path.resolve(path.join(dest, path.basename(src))), 'utf8');
        should.strictEqual(input, output, 'the output should not be modified');
    });

    it('should change the file when requested', function(done) {
        markers = new Markers();
        markers.addMarker({
            tag: 'do-replace',
            //    1                    2                  3           4
            re: '([ \\t]*)<!-- @begin:([A-Za-z0-9-]+)(?::(\\S+))* -->([^]*?)<!-- @end:\\2 -->',
            replace: '$1<div><div>some pointless encapsulation</div></div>'
        });
        gulp.src(src)
            .pipe(markers.findMarkers())
            .pipe(markers.replaceMarkers())
            .pipe(rename('replaced.html'))
            .pipe(gulp.dest(dest))
            .on('end', () => done());
    });

    it('should change the file as expected', function() {
        var input = fs.readFileSync(path.resolve(path.join(dest, 'replaced.html')), 'utf8');
        var output = fs.readFileSync(path.resolve(path.join(expected, 'replaced-expected.html')), 'utf8');
        should.strictEqual(input, output, 'the output should not be modified');

    })

});
