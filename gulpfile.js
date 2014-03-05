var gulp = require('gulp');
var gutil = require('gulp-util');
var rev = require('gulp-rev');
var glob = require('glob');
var fs = require('fs');
var path = require('path');
var less = require('gulp-less');
var clean = require('gulp-clean');
var filter = require('gulp-filter');
var replace = require('gulp-replace');
var concat = require('gulp-concat');
var template = require('gulp-template');
var http = require('http');
var connect = require('connect');

var port = gutil.env.port || 8080;

gulp.task('clean', function() {
  return gulp.src('build/**/*')
    .pipe(clean());
});

gulp.task('styles', ['clean'], function() {
  return gulp.src('dev/css/**/*')
    .pipe(less())
    .pipe(concat('index.css'))
    .pipe(rev())
    .pipe(gulp.dest('build'))
});

gulp.task('html', ['clean'], function() {
  var tmplData = JSON.parse(fs.readFileSync('dev/json/index.json'));

  return gulp.src('dev/templates/**/*')
    .pipe(template(tmplData))
    .pipe(gulp.dest('build'));
});

gulp.task('static', ['clean'], function() {
  return gulp.src('static/**/*')
    .pipe(rev())
    .pipe(gulp.dest('build'));
});

var hashedFileRegex = /-[a-z0-9]{8}\.[a-z]+$/i;

gulp.task('remove-unhashed', ['replace-urls'], function() {
  return gulp.src('build/**/*.+(!(html))', {read: false})
    .pipe(filter(function(file) {
      return !file.path.match(hashedFileRegex) && file.stat.isFile();
    }))
    .pipe(clean());
});

gulp.task('replace-urls', ['styles', 'html', 'static'], function() {
  var src = gulp.src('build/**/*.+(html|js|css)');

  glob.sync('build/**/*.+(!(html))').forEach(function(filePath) {
    if (fs.statSync(filePath).isFile()) {
      var replacePath = '/' + path.relative('build', filePath);
      var origPath = replacePath.replace(/-[a-z0-9]{8}(\.[a-z]+)$/i, '$1');
      src = src.pipe(replace(origPath, replacePath));
    }
  });

  return src.pipe(gulp.dest('build'));
});

gulp.task('serve', function() {
  var app = connect();

  app.use(connect.static('build'));

  http.createServer(app).listen(port);

  gutil.log('serving http on port ' + port);
});

gulp.task('watch', function() {
  gulp.watch('dev/css/**/*', ['styles']);
  gulp.watch('dev/templates/**/*', ['html']);
  gulp.watch('static/**/*', ['static']);

  gutil.log('watching...');
});

gulp.task('build', ['clean', 'styles', 'html', 'static', 'replace-urls']);
gulp.task('dev', ['build', 'serve', 'watch']);
