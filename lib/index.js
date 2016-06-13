"use strict";
var Transform = require('stream').Transform;
var FindReplace = require('./findreplace.js');

//
// identifies markers in files and optionally transforms them.
//
// TODO refactor findMarkers and replaceMarkers into a single function
// TODO add multiple-file tests

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
        // allow use of a RegExp because it's cleaner not to have to use \\ to quote
        // in a string expression.
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

    Markers.prototype.findMarkers = function (opts) {
        return this._makeTransform('find', opts);
    }
    Markers.prototype.replaceMarkers = function (opts) {
        return this._makeTransform('replace', opts);
    }
    Markers.prototype._makeTransform = function(findOrReplace, opts) {
        let self = this;
        opts = opts || {};
        findOrReplace = ({find: 'Finder', replace: 'Replacer'})[findOrReplace];
        let debug = opts.debug;

        return new Transform({
            objectMode: true,
            transform: function (file, enc, callback) {
                var action = new FindReplace[findOrReplace](file, self, opts.debug && false);

                if (file.isBuffer()) {
                    //action.write(file.contents);
                    action.end(file.contents);
                    var contents = new Buffer(0);
                    action.on('data', function(data) {
                        contents = Buffer.concat([contents, data]);
                    });
                    action.once('end', function() {
                        file.contents = contents;
                        callback(null, file);
                    });
                    return;
                }

                if (file.isStream()) {
                    file.contents = file.contents.pipe(action);
                }

                callback(null, file);

            }
        });
    }

    return Markers;
}());

