# gulp-markers #

## what does gulp-markers do? ##

gulp-markers finds patterns in gulp streams and transforms them. The patterns and transforms are defined by the user; gulp-markers is just a framework so it can handle a wide range of use cases.

## Usage ##

```
Markers = require('./gulp-markers.js');

// get a markers container
var markers = new Markers();

// add markers to the container
// - marker-name is a string tag that identifies the marker
// - pattern is a string that will be converted into a RegExp object
// - replacer is a string or function (like the replacement argument to RegExp.replace())
// - opts is an object with options
markers.addMarker('marker-name', '<-- my-HTML-marker -->', replacer, opts);


gulp.src('somefiles')
    .pipe(markers.findMarkers)
    .pipe(markers.replaceMarkers)
    ...
    .gulp.dest('somedest');
```


## Why use gulp-markers ##

There are many gulp replace solutions that already exist, so why did I end up creating this one? Simply because I wanted one framework to handle all the different use cases I encountered.

I used a number of the many gulp-replace solutions that already exist and yet found myself writing various custom solutions to handle various corner cases. I found that many of the things I wanted to do required jumping through hoops to work with existing solutions. So when I started to implement yet another solution I decided to try to implement a relatively generic framework. The goal was to expose a basic API that could be used to handle almost any special case.

### Goals ###

1. Make no assumptions about marker formats.

    This allows markers to be inserted in any type of file and for them to encode any information required by the use case. The caller specifies string that will be used to recognize markers.

2. Make no assumption that the substitution is known at marker-recognition time.

    Recognizing markers and performing transforms are separate functions.

3. Allow insertion or replacement of existing content.

    Markers are defined by you so they can be either a simple pattern or two patterns that bracket content to be replaced.

4. Enable replacement to occur at marker recognition time.

    While marker recognition and transformation are separate it should be possible to perform transformation when the marker pattern is recognized.





