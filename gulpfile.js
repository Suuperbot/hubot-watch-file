var gulp = require('gulp');
var plugins = require('gulp-load-plugins')({ lazy: false });
var del = require('del');
var boolifyString = require('boolify-string');

var paths = {
    watch: ['./gulpfile.js', './src/**/*.js', './test/**/*.js', '!test/{temp,temp/**}'],
    tests: ['./test/**/*.js', '!test/{temp,temp/**}'],
    source: ['./src/**/*.js']
};

/*
gulp.task('clean:coverage', del.bind(null, ['./coverage']));

gulp.task('istanbul', ['clean:coverage'], function(cb) {
    gulp.src(paths.source)
    .pipe(plugins.istanbul())
    .on('finish', function() {
        return gulp.src(paths.tests, {
                cwd: __dirname
            })
            .pipe(plugins["if"](!boolifyString(process.env.CI), plugins.plumber()))
            .pipe(plugins.mocha())
            .pipe(plugins.istanbul.writeReports())
            .on('finish', function() {
                process.chdir(__dirname);
                return cb();
            });
    });
});
*/

gulp.task('mocha', [], function() {
    return gulp.src(paths.tests)
        .pipe(plugins.mocha())
})

gulp.task('watch', ['test'], function() {
    return gulp.watch(paths.watch, ['test']);
});

gulp.task('default', ['test']);

//gulp.task('test', ['istanbul']);
gulp.task('test', ['mocha']);
