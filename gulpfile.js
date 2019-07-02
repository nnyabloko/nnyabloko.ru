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

function getData(done) {
  var trello = new Trello(process.env.TRELLO_PUBLIC_KEY, process.env.TRELLO_MEMBER_TOKEN)
  trello.getCardsOnBoard(process.env.CANDIDATES_BOARD).then((cards) => {
    var count = 0;
    new Promise((resolve, reject) => {
      cards.forEach((card,i,ar) => {
        trello.makeRequest('get', '/1/cards/'+card.id+'/attachments/'+card.idAttachmentCover).then((att) => {
          card.img_url = att.url;
          count += 1
          if (count === ar.length) resolve();
        })
      })
    }).then(() => {
      fs.writeFileSync('data.json', JSON.stringify(cards));
      done()
    })
  })
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
  // var candidates = JSON.parse(fs.readFileSync('data.json', 'utf8'))
  gulp.src('./templates/index.ejs')
    .pipe(ejs({ candidates: require('./data.json'), env: process.env }))
    .pipe(rename({ extname: '.html' }))
    .pipe(gulp.dest('./dist'))
  browsersync.reload();
  done();
}

// Watch files
function watchFiles() {
  gulp.watch("./scss/**/*", css);
  gulp.watch("./templates/**/*", ejs_task);
  gulp.watch("./**/*.html", browserSyncReload);
}

// Define complex tasks
const vendor = gulp.series(clean, modules);
const build = gulp.series(vendor, css, files, getData, ejs_task);
const watch = gulp.series(build, gulp.parallel(watchFiles, browserSync));

// Export tasks
exports.css = css;
exports.clean = clean;
exports.vendor = vendor;
exports.build = build;
exports.watch = watch;
exports.default = build;
