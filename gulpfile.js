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
  return gulp.src('dev/css/**/*')
    .pipe(less())
    .pipe(concat('index.css'))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
    .pipe(rev())
    .pipe(gulp.dest('build'))
});

//generate data used for header, sub-header media queries
generateTmplData = function(data) {
  var widths = _.range(data.width, data.minWidth, -data.widthStep);
  var steps = [];

  var headerSize = data.headerSize;
  var subHeaderSize = data.subHeaderSize;
  var headerSpacing = data.headerSpacing;
  var subHeaderSpacing = data.subHeaderSpacing;

  var headerSizeStep = (data.headerSize - data.minHeaderSize) / widths.length;
  var subHeaderSizeStep = (data.subHeaderSize - data.minSubHeaderSize) / widths.length;
  var headerSpacingStep = (data.headerSpacing - data.minHeaderSpacing) / widths.length;
  var subHeaderSpacingStep = (data.subHeaderSpacing - data.minSubHeaderSpacing) / widths.length;

  _.each(widths, function(width, idx) {
    steps.push({
      width: width,
      headerSize: headerSize,
      subHeaderSize: subHeaderSize,
      headerSpacing: headerSpacing,
      subHeaderSpacing: subHeaderSpacing
    });

    headerSize -= headerSizeStep;
    subHeaderSize -= subHeaderSizeStep;
    headerSpacing -= headerSpacingStep;
    subHeaderSpacing -= subHeaderSpacingStep;
  });

  data.steps = steps;

  return data;
};

gulp.task('html', ['clean'], function() {
  var tmplData = JSON.parse(fs.readFileSync('dev/json/index.json'));
  tmplData = generateTmplData(tmplData);

  return gulp.src('dev/templates/**/*')
    .pipe(template(tmplData))
    .pipe(gulp.dest('build'));
});

gulp.task('static', ['clean'], function() {
  var keybaseFilter = filter('!keybase.txt');
  return gulp.src('static/**/*')
    .pipe(keybaseFilter)
    .pipe(rev())
    .pipe(keybaseFilter.restore())
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
  gulp.watch('dev/css/**/*', ['build']);
  gulp.watch('dev/templates/**/*', ['build']);
  gulp.watch('dev/json/**/*', ['build']);
  gulp.watch('static/**/*', ['build']);

  gutil.log('watching...');
});

gulp.task('deploy', ['build'], shell.task([
  'scp -r build/* b3nj4m@b3nj4m.com:~/b3nj4m.com/'
]));

gulp.task('build', ['clean', 'styles', 'html', 'static', 'replace-urls']);
gulp.task('dev', ['build', 'serve', 'watch']);
