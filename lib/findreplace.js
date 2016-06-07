'use strict';

var util = require('util');
var Transform = require('readable-stream/transform');


function Finder (file, markers, debug) {
    Transform.call(this);
    this.markers = markers;
    this.file = file;
    this.debug = debug;
    this.count = 0;
    this.buffered = [];
}

util.inherits(Finder, Transform);

Finder.prototype._transform = function (chunk, enc, done) {
    this.buffered.push(chunk);
    done();
}
// this directly manipulates the markers object.
// TODO abstract it away?
// TODO this could be a read stream except this allows
// option to replace on same pass as find.

Finder.prototype._flush = function (done) {
    var content = Buffer.concat(this.buffered).toString('utf8');
    var m = this.markers.m;
    var tags = this.markers.getMarkerTags();
    var file = this.file;
    var debug = this.debug;

    this.count += 1;

    // find matches for each tag.
    tags.forEach(function (tag) {
        var matches = content.match(m[tag].regexgm);

        if (matches) {
            if (!m[tag].files[file.path]) {
                m[tag].files[file.path] = {};
            }
            // TODO I don't think the groups are needed except for debugging
            var decoded = matches.map(match => {
                var res = m[tag].regexm.exec(match);
                return {match: res[0], groups: res.slice(1)};
            });
            // use the source regex as the hash
            m[tag].files[file.path][m[tag].re] = decoded;
        }
    });

    // return unmodified content.
    this.push(content);
    done();
}

function Replacer (file, markers, debug) {
    Transform.call(this);
    this.markers = markers;
    this.file = file;
    this.count = 0;
    this.debug = debug;
    this.buffered = [];
}

util.inherits(Replacer, Transform);

Replacer.prototype._transform = function (chunk, enc, done) {
    this.buffered.push(chunk);
    done();
}

Replacer.prototype._flush = function (done) {
    var content = Buffer.concat(this.buffered).toString('utf8');
    var m = this.markers.m;
    var tags = this.markers.getMarkerTags();
    var file = this.file;
    var debug = this.debug;

    this.count += 1;
    if (this.debug) {
        this.debug('REPLACER', content);
    }

    // go through each tag using the supplied regex with the 'gm'
    // flags so RegExp.exec can be used to iterate over each match
    // in this file.
    tags.forEach(function (tag) {
        // provide contextual information in case the string replace function
        // requires it. pass it as the first argument (in front of string.replace
        // arguments).
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

    this.push(content);
    done();
}

module.exports = {Finder: Finder, Replacer: Replacer};
