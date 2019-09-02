"use strict";

// Load environment vars
require('dotenv').config()

// Load plugins
const autoprefixer = require("gulp-autoprefixer");
const browsersync = require("browser-sync").create();
const cleanCSS = require("gulp-clean-css");
const fs = require('fs');
const del = require("del");
const gulp = require("gulp");
const merge = require("merge-stream");
const plumber = require("gulp-plumber");
const rename = require("gulp-rename");
const sass = require("gulp-sass");
const Trello = require("trello");
const ejs = require("gulp-ejs")
const glob = require("glob")
const md = require('markdown-it')();
const lvovich = require('lvovich');
const slugify = require('@sindresorhus/slugify');
const payments = [
  {name: "Реквизиты для физлиц", id: "fiz"},
  {name: "Сбербанк сайт", id: "sber-online"},
  {name: "Сбербанк приложение", id: "sber-app"},
  {name: "Тинькофф", id: "tinkoff"},
  {name: "Альфа-банк сайт", id: "alfa-site"},
  {name: "Альфа-банк приложение", id: "alfa-app"},
  {name: "Рокетбанк", id: "rocket"},
  {name: "ВТБ сайт", id: "vtb-site"}
]

// BrowserSync
function browserSync(done) {
  browsersync.init({
    server: {
      baseDir: "./dist/"
    },
    ghostMode: false,
    port: 3000
  });
  done();
}

// BrowserSync reload
function browserSyncReload(done) {
  browsersync.reload();
  done();
}

// Clean dist
function clean() {
  return del(["./dist/"]);
}



// Bring third party dependencies from node_modules into vendor directory
function modules() {
  // Bootstrap
  var bootstrap = gulp.src('./node_modules/bootstrap/dist/**/*')
    .pipe(gulp.dest('./dist/vendor/bootstrap'));
  // jQuery
  var jquery = gulp.src([
      './node_modules/jquery/dist/*',
      '!./node_modules/jquery/dist/core.js'
    ])
    .pipe(gulp.dest('./dist/vendor/jquery'));
  return merge(bootstrap, jquery);
}

// CSS task
function css() {
  return gulp
    .src("./scss/**/*.scss")
    .pipe(plumber())
    .pipe(sass({
      outputStyle: "expanded",
      includePaths: "./node_modules",
    }))
    .on("error", sass.logError)
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe(gulp.dest("./dist/css"))
    .pipe(rename({
      suffix: ".min"
    }))
    .pipe(cleanCSS())
    .pipe(gulp.dest("./dist/css"))
    .pipe(browsersync.stream());
}

function files(done) {
  gulp.src(
    [
      './img/**/*',
      './robots.txt',
      './favicon.ico'
    ],
    {allowEmpty: true, base: '.'}
  )
    .pipe(gulp.dest('./dist'));
  done()
}

// EJS task
function ejs_task(done) {
  gulp.src(['./templates/index.ejs'])
    .pipe(ejs({
      env: process.env,
      glob: glob,
      payments: payments,
      lvovich: lvovich,
      slugify: slugify,
      md: md }))
    .pipe(rename({ extname: '.html' }))
    .pipe(gulp.dest('./dist'))
  browsersync.reload();
  done();
}

// Watch files
function watchFiles() {
  gulp.watch("./scss/**/*", css);
  gulp.watch("./templates/**/*.ejs", ejs_task);
  gulp.watch("./**/*.html", browserSyncReload);
  gulp.watch("./img/**/*", files);
}

// Define complex tasks
const vendor = gulp.series(clean, modules);
const build = gulp.series(vendor, css, files, ejs_task);
const watch = gulp.series(build, gulp.parallel(watchFiles, browserSync));

// Export tasks
exports.css = css;
exports.clean = clean;
exports.vendor = vendor;
exports.build = build;
exports.watch = watch;
exports.default = build;
