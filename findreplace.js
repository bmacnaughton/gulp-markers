'use strict';

var util = require('util');
var Transform = require('readable-stream/transform');


function Finder (file, markers) {
    Transform.call(this);
    this.markers = markers;
    this.file = file;
}

util.inherits(Finder, Transform);

// this directly manipulates the markers object.
// TODO abstract it away?
// TODO this could be a read stream except this allows
// option to replace on same pass as find.
Finder.prototype._transform = function (chunk, enc, done) {
    var content = chunk.toString('utf8');
    var m = this.markers.m;
    var tags = this.markers.getMarkerTags();
    var file = this.file;

    tags.forEach(function (tag) {
        var matches = content.match(m[tag].regexgm);

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
    // no transform, but maybe will be
    done(null, content);
}

function Replacer (file, markers) {
    Transform.call(this);
    this.markers = markers;
    this.file = file;
}

util.inherits(Replacer, Transform);

Replacer.prototype._transform = function (chunk, enc, done) {
    var content = chunk.toString('utf8');
    var m = this.markers.m;
    var tags = this.markers.getMarkerTags();
    var file = this.file;


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
        if (typeof m[tag].replace === 'string') {
            replacer = m[tag].replace;
        } else {
            replacer = function() {
                var args = Array.prototype.slice.call(arguments);
                args.unshift(context);
                return m[tag].replace.apply(null, args);
            }
        }

        content = content.replace(m[tag].regexgm, replacer);
    });

    done(null, content);
}

module.exports = {Finder: Finder, Replacer: Replacer};
