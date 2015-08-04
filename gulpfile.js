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

// TODO: Put this in external config file
var apps = [
  { manifest: 'http://stop-it.apps.lmorchard.com/manifest.webapp' },
  { manifest: 'https://lmorchard.github.io/c25k-web/manifest.webapp' },
  { manifest: 'https://lmorchard.github.io/fxos-addon-quick-brightness/manifest.webapp' },
  { manifest: 'https://lmorchard.github.io/fxos-addon-messages-bigger-send-button/manifest.webapp' },
  { manifest: 'https://lmorchard.github.io/fxos-addon-messages-enter-to-send/manifest.webapp' },
  { manifest: 'https://lmorchard.github.io/fxos-addon-messages-smaller-message-font/manifest.webapp' },
  { manifest: 'https://lmorchard.github.io/fxos-addon-quartz-full-story-fix/manifest.webapp' }
];

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

gulp.task('build:indexes', function () {
  Promise.all(apps.map(function (app) {
    return request({
      url: app.manifest,
      json: true
    }).then(function (results) {

      var data = results[1];
      var out = _.assign(app, data);

      var baseUrl = out.baseUrl = out.manifest.replace('/manifest.webapp', '');

      if (out.icons['512']) {
        out.icon = baseUrl + out.icons['512'];
      } else if (out.icons['128']) {
        out.icon = baseUrl + out.icons['128'];
      } else {
        out.icon = '/img/rocket.png';
      }

      return out;

    })
  })).then(function (apps) {
    var data = JSON.stringify(apps, null, ' ');
    fs.writeFileSync('dist/index.json', data);
  }).catch(function (err) {
    console.error(err);
  });
});

gulp.task('build:templates', function () {

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
