var _ = require('underscore');
var gulp = require('gulp');
var gutil = require('gulp-util');
var rev = require('gulp-rev');
var glob = require('glob');
var fs = require('fs');
var path = require('path');
var less = require('gulp-less');
var clean = require('rimraf');
var filter = require('gulp-filter');
var replace = require('gulp-replace');
var concat = require('gulp-concat');
var template = require('gulp-template');
var autoprefixer = require('gulp-autoprefixer');
var http = require('http');
var connect = require('connect');
var shell = require('gulp-shell');

var port = gutil.env.port || 8080;

gulp.task('clean', function(done) {
  clean('build', done);
});

gulp.task('styles', ['clean'], function() {
  return gulp.src(['node_modules/materialize-css/bin/*.css', 'dev/css/**/*'])
    .pipe(less())
    .pipe(concat('index.css'))
    .pipe(autoprefixer('last 2 version', 'safari 6', 'ie 9', 'opera 12.1', 'ios 7', 'android 4'))
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
  var keybaseFilter = filter('!keybase.txt');
  return gulp.src(['node_modules/jquery/dist/jquery.min.js', 'node_modules/materialize-css/bin/*.js', 'static/**/*'])
    .pipe(keybaseFilter)
    .pipe(rev())
    .pipe(keybaseFilter.restore())
    .pipe(gulp.dest('build'));
});

gulp.task('fonts', ['clean'], function() {
  return gulp.src('node_modules/materialize-css/font/roboto/*')
    .pipe(rev())
    .pipe(gulp.dest('build/font/roboto'));
});

var hashedFileRegex = /-[a-z0-9]{8}\.[a-z]+$/i;

gulp.task('remove-unhashed', ['replace-urls'], function() {
  return gulp.src('build/**/*.+(!(html))', {read: false})
    .pipe(filter(function(file) {
      return !file.path.match(hashedFileRegex) && file.stat.isFile();
    }))
    .pipe(clean());
});

gulp.task('replace-urls', ['styles', 'html', 'static', 'fonts'], function() {
  var src = gulp.src('build/**/*.+(html|js|css)');

  glob.sync('build/**/*.+(!(html))').forEach(function(filePath) {
    if (fs.statSync(filePath).isFile()) {
      var replacePath = '/' + path.relative('build', filePath);
      var origPath = replacePath.replace(/-[a-z0-9]{8}(\.[a-z0-9]+)$/i, '$1');
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
  gulp.watch('dev/css/**/*', ['build']);
  gulp.watch('dev/templates/**/*', ['build']);
  gulp.watch('dev/json/**/*', ['build']);
  gulp.watch('static/**/*', ['build']);

  gutil.log('watching...');
});

gulp.task('deploy', ['build'], shell.task([
  'scp -r build/* b3nj4m@b3nj4m.com:~/b3nj4m.com/'
]));

gulp.task('build', ['clean', 'styles', 'html', 'static', 'fonts', 'replace-urls']);
gulp.task('dev', ['build', 'serve', 'watch']);
