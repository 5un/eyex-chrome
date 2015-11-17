var gulp  = require('gulp'),
    gutil = require('gulp-util'),
    jshint = require('gulp-jshint'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify')

// define the default task and add the watch task to it
gulp.task('default', ['watch']);

// configure the jshint task
gulp.task('jshint', function() {
  return gulp.src('src/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

// configure which files to watch and what tasks to use on file changes
gulp.task('watch', function() {
  gulp.watch('src/**/*.js', ['jshint']);
});

gulp.task('build', function() {
  return gulp.src('src/**/*.js')
    .pipe(concat('eyex-chrome.js'))
    //only uglify if gulp is ran with '--type production'
    .pipe(uglify()) 
    .pipe(gulp.dest('dist/'))
    .pipe(gulp.dest('examples/chromeapp/scripts'));
});