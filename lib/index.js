"use strict";
var Transform = require('readable-stream/transform');
var FindReplace = require('./findreplace.js');
//
// identifies replacement markers in files and processes them using
// supplied functions.
//
// TODO allow findMarkers to do replaces inline
// TODO testing
// TODO write DOCs
// TODO make work with streams?
// TODO provide marker name to replace function.
module.exports = (function () {
    function Markers() {
        this.m = {};
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
    Markers.prototype.getMarkerTags = function () {
        return Object.keys(this.m);
    };
    Markers.prototype.getMarker = function (tag) {
        return this.m[tag];
    };
    Markers.prototype.getFiles = function(tag) {
        var files = Object.keys(this.m[tag].files);
        return files;
    };
    Markers.prototype.getMatches = function(tag, file) {
        return this.m[tag].files[file].slice();
    };

    // this is the gulp .pipe processor to find markers in files
    Markers.prototype.findMarkers = function (file, enc, callback) {
        var self = this;

        return new Transform({
            objectMode: true,
            transform: function (file, enc, callback) {
                var finder = new FindReplace.Finder(file, self);
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
    Markers.prototype.replaceMarkers = function (file, enc, callback) {
        var self = this;

        return new Transform({
            objectMode: true,
            transform: function (file, enc, callback) {
                var finder = new FindReplace.Replacer(file, self);
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

    return Markers;
}());

