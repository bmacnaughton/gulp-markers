"use strict";
var through = require('through2');
//
// identifies replacement markers in files and processes them using
// supplied functions.
//
// TODO allow findMarkers to do replaces inline
// TODO testing
// TODO write DOCs
// TODO make work with streams?
// TODO provide marker name to replace function.
var Markers = (function () {
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
        var tags = this.getMarkerTags();
        var m = this.m;
        var findMarkers = function (file, enc, callback) {
            if (file.isNull()) {
                return callback(null, file);
            }
            function findMarkers() {
                if (file.isStream()) {
                    throw "Markers.findMarkers is not implemented for streams";
                } else if (file.isBuffer()) {
                    var text = String(file.contents);
                    // if the pattern is found add this to the files array. use
                    // the full path as the index and the pattern as the value.
                    // use .match so groups are not captured - this should
                    // speed up the first pass of finding the markers. then
                    // use only the 'm' flag on the regex to extract the groups
                    // from each item found.
                    // TODO if sequenced correctly this could do replacements too.
                    tags.forEach(function (tag) {
                        var matches = text.match(m[tag].regexgm);

                        if (matches) {
                            if (!m[tag].files[file.path]) {
                                m[tag].files[file.path] = {};
                            }
                            // TODO I don't think this is needed except for debugging
                            var decoded = matches.map(match => {
                                var res = m[tag].regexm.exec(match);
                                return {match: res[0], groups: res.slice(1)};
                            });
                            m[tag].files[file.path] = decoded;
                        }
                    });
                }
                callback(null, file);
            }
            findMarkers();
        };
        return through.obj(findMarkers);
    };

    // this is the gulp .pipe processor to replace/insert text for markers.
    Markers.prototype.replaceMarkers = function (file, enc, callback) {
        var tags = this.getMarkerTags();
        var m = this.m;
        var replaceMarkers = function (file, enc, callback) {
            if (file.isNull()) {
                return callback(null, file);
            }
            function replaceMarkers() {
                if (file.isStream()) {
                    throw "Markers.replaceMarkers is not implemented for streams";
                } else if (file.isBuffer()) {
                    var text = String(file.contents);
                    // go through each tag using the supplied regex with the 'gm'
                    // flags so RegExp.exec can be used to iterate over each match
                    // in this file.
                    tags.forEach(function (tag) {
                        // if this tag wants access to the file information pass it
                        // as the first argument (in front of string.replace arguments).
                        var context = {
                            tag: tag,
                            data: m[tag].data,
                            file: {cwd: file.cwd, base: file.base, path: file.path}
                        };
                        var replacer;
                        if (m[tag].replace instanceof String) {
                            replacer = m[tag].replace;
                        } else {
                            replacer = function() {
                                var args = Array.prototype.slice.call(arguments);
                                args.unshift(context);
                                return m[tag].replace.apply(null, args);
                            }
                        }

                        text = text.replace(m[tag].regexgm, replacer);
                    });
                    // set the file contents as modified.
                    file.contents = new Buffer(text);
                }
                callback(null, file);
            }
            replaceMarkers();
        };
        return through.obj(replaceMarkers);
    };


    return Markers;
}());

exports.Markers = Markers;
