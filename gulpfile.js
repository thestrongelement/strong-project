const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const del = require('del');
const handlebars = require('gulp-compile-handlebars');
const nunjucks = require('gulp-nunjucks-html');
const path = require('path');
const yargs = require('yargs');
const browserSync = require('browser-sync').create();

const PRODUCTION = !!(yargs.argv.production);
const DEBUG = !!(yargs.argv.debug);

const src = {
  path: 'src/',
  data: 'data/',
  public: 'public/',
  scripts: 'src/scripts/**/*',
  images: 'src/images/**/*',
  styles: 'src/styles/',
  bower: 'bower_components/',
  fonts: 'src/fonts',
  html: 'src/templates/**/*.html',
  layouts: 'src/templates/layouts/',
  includes: 'src/templates/includes/',
  macros: 'src/templates/macros/',
  svgs: 'src/svg/',
}

const dist = {
  path: 'dist',
  data: 'dist/api',
  scripts: 'dist/js',
  images: 'dist/img',
  styles: 'dist/css',
  fonts: 'dist/fonts',
  html: 'dist/'
}

// ENVIRONMENT SETUP
var server;
const date = new Date();

//DATE
const app = require('./' + src.data + 'app.json');
const pkg = require('./package.json');

// HELPERS
// get key from file name, e.g. index.html returns index
function getPageKey(file) {
  var filePath = path.basename(file.path);
  return filePath.replace(/\.[^/.]+$/, "");
}
var getAppData = function(file) {
  try {
    //set menu states
    var selectedId = getPageKey(file);
    app.menu.forEach(function (obj) {
      obj.selected = obj.id === selectedId || selectedId.indexOf(obj.id) !== -1;
    });
    return { app: app };
  } catch(err) {
    console.log(err.message);
  }
  return { app: {} };
};
var getPageData = function(file) {
  try {
    var key = getPageKey(file);
    var page = require('./' + src.data + key + '.json');
    page.id = key;
    return { page: page };
  } catch(err) {
    console.log(err.message);
  }
  return { page: {} };
};

//TASK RUNNERS
gulp.task('serve', function (done) {
  browserSync.init({
      server: dist.path,
      open: true,
      reloadOnRestart: true,
      reloadDelay: 100
  });
  done();
});

// build static HTML files
gulp.task('html', function () {
  return gulp.src([src.html, '!'+src.includes+'*', '!'+src.layouts+'*', '!'+src.macros+'*'])
    .pipe($.data(getAppData))
    .pipe($.data(getPageData))
    .pipe(nunjucks({
      searchPaths: [src.layouts, src.includes, src.macros],
      locals: {
        date: date
      }
    }))
    .pipe(gulp.dest(dist.path))
    .pipe(browserSync.stream());
});


// process and transpile JS
gulp.task('js', function() {
  return gulp.src(src.scripts)
    .pipe($.include())
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    .pipe($.if(PRODUCTION, $.uglify()))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
		.pipe(gulp.dest(dist.scripts))
    .pipe(browserSync.stream());
});

// process SASS
gulp.task('css', ['less'], function () {
    console.log('serving Less');
});

// process SASS
gulp.task('sass', function () {
  return gulp.src([src.styles + '*.scss', '!'+ src.styles + 'debug.scss'])
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      outputStyle: (PRODUCTION?'compressed':'expanded'),
      precision: 10,
      includePaths: [src.styles],
      errLogToConsole: true
    })
    .on('error', $.sass.logError))
    .pipe($.postcss([
      require('autoprefixer-core')({browsers: ['last 1 version', 'ie >= 10', 'and_chr >= 2.3']})
    ]))
    .pipe($.if(PRODUCTION, $.cssnano()))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(dist.styles))
    .pipe(browserSync.stream());
});

// process LESS
gulp.task('less', function () {
  return gulp.src([src.styles + '*.less', '!'+ src.styles + 'debug.less'])
    .pipe($.less({
      paths: [src.styles, src.bower]
    }))
    .pipe(gulp.dest(dist.styles));
});


// process images
gulp.task('images', function() {
	gulp.src(src.images)
		.pipe($.if(PRODUCTION, $.imagemin({
  		progressive: true,
  		svgoPlugins: [{cleanupIDs: true, removeTitle: true}]
		})))
		.pipe(gulp.dest(dist.images))
});


// copy JSON files
gulp.task('data', function() {
  return gulp.src(src.data+'**/*.json')
	  .pipe(gulp.dest(dist.data));
});

gulp.task('clean', del.bind(null, [dist.path]));

// process static files (for favicon.ico, touch icons, etc.)
gulp.task('public', function() {
  return gulp.src(src.public + '**/*')
	  .pipe(gulp.dest(dist.path));
});

//build
gulp.task('build', function(cb) {
  $.sequence('clean',['public','images','css','js','html'], cb);
});

gulp.task('default', function (cb) {
  $.sequence('build','serve','watch',cb);
});

gulp.task('watch', function () {
  gulp.watch(src.html, ['html']);
  gulp.watch(src.styles + '**/*', ['css']);
  gulp.watch(src.scripts, ['js']);
});
