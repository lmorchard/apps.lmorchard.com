var fs = require('fs');
var url = require('url');
var path = require('path');
var stream = require('stream');

var _ = require('lodash');
var gulp = require('gulp');
var browserify = require('browserify');
var connect = require('gulp-connect');
var stylus = require('gulp-stylus');
var uglify = require('gulp-uglify');
var source = require('vinyl-source-stream');
var babelify = require("babelify");
var transform = require('vinyl-transform');
var buffer = require('vinyl-buffer');
var Promise = require("bluebird");
var request = Promise.promisify(require("request"));
var through = require('through2');
var nunjucks = require('nunjucks');

var gulpIf = require('gulp-if');
var parallelize = require("concurrent-transform");
var awspublish = require('gulp-awspublish');

var config = require('./config');

var DEPLOY_CONCURRENCY = 32;
var GZIP_EXTENSIONS = [
  'html', 'json', 'rss', 'css', 'js',
  'otf', 'eot', 'svg', 'ttf', 'woff', 'woff2'
];

nunjucks.configure({ watch: false });

gulp.task('build', [
  'build:indexes', 'build:browserify', 'build:assets',
  'build:stylus', 'build:templates'
]);

gulp.task('build:browserify', ['build:indexes'], function () {
  return browserify({
      entries: ['./src/index.js'],
      debug: true,
      fullPaths: true
    })
    .transform(babelify)
    .bundle()
    .pipe(source('index.js'))
    .pipe(buffer())
    //.pipe(uglify())
    .pipe(gulp.dest('./dist'))
    .pipe(connect.reload());
});

function filterApp (app, response, data) {
  var out = _.assign({}, app, data);
  out.baseUrl = out.manifest.replace('/manifest.webapp', '');

  if (_.has(out, 'icons[512]')) {
    out.icon = out.baseUrl + out.icons[512];
  } else if (_.has(out, 'icons[256]')) {
    out.icon = out.baseUrl + out.icons[256];
  } else if (_.has(out, 'icons[128]')) {
    out.icon = out.baseUrl + out.icons[128];
  } else {
    out.icon = '/img/default-icon.svg';
  }

  return out;
}

function renderTemplate (globals) {
  return function (file, enc, done) {
    var tmpl = file.contents.toString('utf-8');
    var locals = _.assign({ }, globals);
    var rendered = nunjucks.renderString(tmpl, locals);
    file.contents = new Buffer(rendered);
    this.push(file);
    return done();
  };
}

gulp.task('build:stylus', function () {
  return gulp.src('./src/**/*.styl')
    .pipe(stylus())
    .pipe(gulp.dest('./dist'))
    .pipe(connect.reload());
});

gulp.task('build:assets', function () {
  return gulp.src([
      './src/manifest.webapp',
      './src/**/*.svg',
      './src/**/*.png'
    ])
    .pipe(gulp.dest('./dist'))
    .pipe(connect.reload());
});

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
  return gulp.src('./src/*.html')
    .pipe(through.obj(renderTemplate(globals)))
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
  var isGzippable = function (file) {
    var ext = file.path.split('.').pop();
    return GZIP_EXTENSIONS.indexOf(ext) !== -1;
  };
  var publisher = awspublish.create(config.aws);
  return gulp.src('./dist/**')
    .pipe(parallelize(gulpIf(isGzippable, awspublish.gzip()), DEPLOY_CONCURRENCY))
    .pipe(parallelize(publisher.publish(), DEPLOY_CONCURRENCY))
    .pipe(publisher.cache())
    .pipe(awspublish.reporter());
});

gulp.task('server', ['build', 'connect', 'watch']);

gulp.task('default', ['server']);
