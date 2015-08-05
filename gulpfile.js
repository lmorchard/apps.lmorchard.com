var _ = require('lodash');
var fs = require('fs');
var url = require('url');
var browserify = require('browserify');
var connect = require('gulp-connect');
var gulp = require('gulp');
var path = require('path');
var stylus = require('gulp-stylus');
var uglify = require('gulp-uglify');
var source = require('vinyl-source-stream');
var deploy = require('gulp-gh-pages');
var babelify = require("babelify");
var transform = require('vinyl-transform');
var buffer = require('vinyl-buffer');
var tap = require('gulp-tap');
var Promise = require("bluebird");
var request = Promise.promisify(require("request"));
var stream = require('stream');
var through = require('through2');
var nunjucks = require('nunjucks');

nunjucks.configure({ watch: false });

gulp.task('build', [
  'stylus', 'assets', 'browserify-app',
  'build:indexes', 'build:templates'
]);

gulp.task('browserify-app', function () {
  return browserify({
      entries: ['./src/index.js'],
      debug: true,
      fullPaths: true
    })
    .transform(babelify)
    .bundle()
    .pipe(source('index.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('./dist'))
    .pipe(connect.reload());
});

gulp.task('stylus', function () {
  return gulp.src('./src/**/*.styl')
    .pipe(stylus())
    .pipe(gulp.dest('./dist'))
    .pipe(connect.reload());
});

function filterApp (app, response, data) {
  var out = _.assign({}, app, data);

  out.baseUrl = out.manifest.replace('/manifest.webapp', '');
  out.icon = ('icons' in out && '128' in out.icons) ?
    (out.baseUrl + out.icons['128']) : false;

  return out;
}

gulp.task('build:indexes', function () {
  var apps = JSON.parse(fs.readFileSync('src/index.json'));
  Promise.all(apps.map(function (app) {
    return request({
      url: app.manifest,
      json: true
    }).then(function (results) {
      return filterApp(app, results[0], results[1]);
    });
  })).then(function (apps) {
    var data = JSON.stringify(apps, null, ' ');
    fs.writeFileSync('dist/index.json', data);
  }).catch(function (err) {
    console.error(err);
  });
});

gulp.task('build:templates', ['build:indexes'], function () {

  var apps = JSON.parse(fs.readFileSync('dist/index.json'));

  var globals = {
    apps: apps
  };

  var renderTemplate = function (file, enc, done) {
    var tmpl = file.contents.toString('utf-8');
    var locals = _.assign({ }, globals);
    var rendered = nunjucks.renderString(tmpl, locals);
    file.contents = new Buffer(rendered);
    this.push(file);
    return done();
  };

  return gulp.src('./src/*.html')
    .pipe(through.obj(renderTemplate))
    .pipe(gulp.dest('./dist'))
    .pipe(connect.reload());

});

gulp.task('assets', function () {
  return gulp.src([
      './src/manifest.webapp',
      './src/**/*.svg',
      './src/**/*.png'
    ])
    .pipe(gulp.dest('./dist'))
    .pipe(connect.reload());
});

gulp.task('connect', function() {
  connect.server({
    root: 'dist',
    livereload: true,
    port: 3001
  });
});

gulp.task('watch', function () {
  gulp.watch('./src/**/*', ['build']);
});

gulp.task('deploy', function () {
  gulp.src('./dist/**/*')
    .pipe(deploy({}));
});

gulp.task('server', ['build', 'connect', 'watch']);

gulp.task('default', ['server']);
