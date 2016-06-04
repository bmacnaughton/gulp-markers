"use strict";
var Transform = require('readable-stream/transform');
var FindReplace = require('./findreplace.js');

//
// identifies markers in files and optional transforms them.
//
// TODO refactor findMarkers and replaceMarkers into a single function
// TODO add multiple-file tests
// TODO add concat-stream option (only way to be sure regexes work with streams)

module.exports = (function () {
    function Markers(markers) {
        this.m = {};
        if (markers) {
            this.addMarkers(markers);
        }
    }
    Markers.prototype.addMarker = function (tag, re, replace, opts) {
        // allow an object argument for all options
        if (tag instanceof Object) {
            re = tag.re;
            replace = tag.replace;
            opts = tag.opts;
            tag = tag.tag;
        }
        // allow use of a RegExp because it's cleaner not to have to user \\ to quote
        // in the expression.
        if (re instanceof RegExp) {
            re = re.source
        }

        this.m[tag] = {re: re, replace: replace, files: {}};
        this.m[tag].regexgm = new RegExp(re, 'gm');
        this.m[tag].regexm = new RegExp(re, 'm');
        this.m[tag].opts = Object.assign({}, opts);
        // make a direct reference to the data object and make sure there is one.
        this.m[tag].data = this.m[tag].opts.data || {};
    };
    Markers.prototype.addMarkers = function(markers) {
        markers.forEach(m => this.addMarker(m));
    };
    Markers.prototype.getMarkerTags = function () {
        return Object.keys(this.m);
    };
    Markers.prototype._getMarker = function (tag) {
        return this.m[tag];
    };
    Markers.prototype.getFilesForMarker = function(tag) {
        var files = Object.keys(this.m[tag].files);
        return files;
    };
    Markers.prototype.getMatches = function(tag, file) {
        return this.m[tag].files[file].slice();
    };

    // this is the gulp .pipe processor to find markers in files
    Markers.prototype.findMarkers = function (opts) {
        var self = this;
        opts = opts || {};

        return new Transform({
            objectMode: true,
            transform: function (file, enc, callback) {
                var finder = new FindReplace.Finder(file, self, opts.debug);
                if (file.isBuffer()) {
                    finder.write(file.contents);
                    finder.end();
                    var contents = new Buffer(0);
                    finder.on('data', function(data) {
                        contents = Buffer.concat([contents, data]);
                    });
                    finder.once('end', function() {
                        file.contents = contents;
                        callback(null, file);
                    });
                    return;
                }

                if (file.isStream()) {
                    file.contents = file.contents.pipe(finder);
                }

                callback(null, file);


            }
        });
    }

    // this is the gulp .pipe processor to replace markers in files
    Markers.prototype.replaceMarkers = function (opts) {
        var self = this;
        opts = opts || {};

        return new Transform({
            objectMode: true,
            transform: function (file, enc, callback) {
                var replacer = new FindReplace.Replacer(file, self, opts.debug);
                if (file.isBuffer()) {
                    replacer.write(file.contents);
                    replacer.end();
                    var contents = new Buffer(0);
                    replacer.on('data', function(data) {
                        contents = Buffer.concat([contents, data]);
                    });
                    replacer.once('end', function() {
                        file.contents = contents;
                        callback(null, file);
                    });
                    return;
                }

                if (file.isStream()) {
                    file.contents = file.contents.pipe(replacer);
                }

                callback(null, file);


            }
        });
    }

    return Markers;
}());

