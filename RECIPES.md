Recipe for inserting a copyright notice into an HTML file. The copyright notice is updated so it always includes the current year.

The marker:
```html
<!-- insert:html-copyright:2013 -->
```

JavaScript in gulpfile.js (excerpted):

```js
//
// setup in gulpfile
//
marker = {
    tag: 'html-copyright',
    re: '<!-- insert:html-copyright:(\\d{4}) -->',
    replace: function (context, match, startYear) {
        var year = new Date().getFullYear();
        var range = '-' + year;
        if (year == startYear) {
            range = '';
        }
        return '<!-- Copyright BAM ' + startYear + range + ' -->';
    }
}

var copyrightMarker - new Markers();
markers.addMarker(copyrightMarker);

//
// the gulp task
//
gulp.task("html-copyright-insertion", function() {
    return gulp.src("*.html")
        .pipe(markers.replaceMarkers())
        .pipe(gulp.dest("destination"))
});

```