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
var markerDefinitions = require('./fixtures/marker-definitions');

// run a buffer/stream-independent test
runCoreTest();

// run a suite of tests for buffers and streams
runTests('buffer');
runTests('stream');


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
    var markerSets = [];
    var markers, markerTagsDefined;

    // add the markers via objects and arguments.
    markers = new Markers();

    // add markers both ways here
    markerDefinitions.forEach(m => markers.addMarker(m));
    markers.addMarker(
        'html-copyright-non-object',
        new RegExp('<!-- insert:html-copyright-non-object:(\\d{4}) -->'),
        function (context, match, startYear) {
            var year = new Date().getFullYear();
            return '<!-- Copyright BAM ' + startYear + '-' + year + ' -->';
        }
    );
    // keep track of tags.
    markerTagsDefined = markerDefinitions.map(m => m.tag);
    markerTagsDefined.push('html-copyright-non-object');
    markerSets.push({markers, markerTagsDefined, msg: "added using addMarker()"});

    // now define them using the multiple add function.
    markers = new Markers();
    markers.addMarkers(markerDefinitions);
    markerTagsDefined = markerDefinitions.map(m => m.tag);
    markerSets.push({markers, markerTagsDefined, msg: "added using addMarkers()"});

    // now define them at construction time
    markers = new Markers(markerDefinitions);
    markerTagsDefined = markerDefinitions.map(m => m.tag);
    markerSets.push({markers, markerTagsDefined, msg: "added using Marker() constructor"});

    describe('verify internal consistency of Marker class after adding markers', function () {

        markerSets.forEach(function(ms) {
            it("right number of markers when " + ms.msg, function() {
                var markers = ms.markers;
                var markerTagsDefined = ms.markerTagsDefined;

                var markerTags = markers.getMarkerTags();
                (markerTags.length).should.equal(markerTagsDefined.length);
            });

            it("right tags when " + ms.msg, function() {
                var markers = ms.markers;
                var markerTagsDefined = ms.markerTagsDefined;

                var markerTags = markers.getMarkerTags();
                markerTags.should.containDeep(markerTagsDefined);
                markerTagsDefined.should.containDeep(markerTags);
            });

        })
        /*
        for (var i = 0; i < markerSets.length; i++) {
            it('should have the right number of markers', function() {
                var markers = markerSets[i].markers;
                var markerTagsDefined = markerSets[i].markerTagsDefined;

                var markerTags = markers.getMarkerTags();
                (markerTags.length).should.equal(markerTagsDefined.length);
            });

            it('should have the right tags', function() {
                var markers = markerSets[i].markers;
                var markerTagsDefined = markerSets[i].markerTagsDefined;

                var markerTags = markers.getMarkerTags();
                markerTags.should.containDeep(markerTagsDefined);
                markerTagsDefined.should.containDeep(markerTags);
            });
        };
        // */
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

