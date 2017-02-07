'use strict'

var version = '1.0.0';

require('events').EventEmitter.defaultMaxListeners = 0;

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var browserSync = require('browser-sync');
var del = require('del');
var nunjucks = require('gulp-nunjucks-html');
var path = require('path');
var yargs = require('yargs');

var PRODUCTION = !!(yargs.argv.production);
var DEBUG = !!(yargs.argv.debug);

var src = {
  path: 'src/',
  data: 'data/',
  public: 'public/**/*',
  scripts: 'src/js/',
  images: 'src/img/**/*',
  styles: 'src/css/',
  bower: 'bower_components/',
  fonts: 'src/fonts',
  html: 'src/html/**/*.html',
  layouts: 'src/html/tmpls/',
  includes: 'src/html/incl/',
  macros: 'src/html/incl/',
  svgs: 'src/svg/',
}

var dist_base = 'www';

var dist = {
  path: dist_base,
  data: dist_base + '/api',
  scripts: dist_base + '/js',
  images: dist_base + '/img',
  styles: dist_base + '/css',
  fonts: dist_base + '/fonts',
  html: dist_base + '/'
}

// environment setup
var server;
var date = new Date();

//data
var app = require('./' + src.data + 'app.json');

// helpers

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
gulp.task('serve', ['build'], function () {
  server = browserSync({
    notify: false,
    port: 9000,
    server: {
      baseDir: [dist.path]
    }
  });
  gulp.watch(src.html, ['html']);
  gulp.watch(src.styles + '**/*', ['css']);
  gulp.watch(src.scripts + '**/*', ['js']);
  gulp.watch(src.svgs + '**/*', ['inline-svgs']);
});

// build static HTML files
gulp.task('html', ['inline-svgs'], function () {
  return gulp.src([src.html, '!'+src.includes+'*', '!'+src.layouts+'*', '!'+src.macros+'*'])
    .pipe($.data(getAppData))
    .pipe($.data(getPageData))
    .pipe(nunjucks({
      searchPaths: [src.layouts, src.includes, src.macros, src.svgs],
      locals: {
        date: date,
        env: PRODUCTION ? 'production' : DEBUG ? 'debug' : 'development'
      }
    }))
    .pipe($.if(!DEBUG, $.htmlmin({collapseWhitespace: true})))
    .pipe(gulp.dest(dist.path))
    .pipe(reload())
});


// process and transpile JS
gulp.task('js', function() {
  return gulp.src(src.scripts + 'arity.js')
    .pipe($.include({
      includePaths: [
        src.scripts,
        src.bower
      ]
    }))
    .on('error', console.log)
    .pipe($.sourcemaps.init())
    .pipe($.babel({ 
        "presets": ["es2015"]
    }))
    .pipe($.if(!DEBUG, $.uglify()))
    .pipe($.if(DEBUG, $.sourcemaps.write()))		
    .pipe(gulp.dest(dist.scripts))
    .pipe(reload());
});

// process SASS
gulp.task('css', function () {
  return gulp.src([src.styles + '*.scss'])
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      outputStyle: (!DEBUG ? 'compressed':'expanded'),
      precision: 10,
      includePaths: [src.styles],
      errLogToConsole: true
    })
    .on('error', $.sass.logError))
    .pipe($.if(!DEBUG, $.cssnano()))
    .pipe($.postcss([
      require('autoprefixer')({browsers: ['last 2 versions', 'ie >= 9', 'and_chr >= 2.3']})
    ]))
    .pipe($.if(DEBUG, $.sourcemaps.write()))
    .pipe(gulp.dest(dist.styles))
    .pipe(reload());
});

// processes inline svgs (these need to be optimized before they are included as part of the HTML processing)
gulp.task('inline-svgs', function() {
  return gulp.src(src.svgs + '/**/*')
    .pipe($.imagemin(
      [$.imagemin.svgo({
          plugins: [{removeTitle: true}, {cleanupIDs: true}]
      })]
    ))
    .pipe(gulp.dest(src.svgs));
});

// processes images in dist directory
gulp.task('images', function() {
	return gulp.src(src.images)
		.pipe($.imagemin())
		.pipe(gulp.dest(dist.images))
});

// copy JSON files
gulp.task('data', function() {
  return gulp.src(src.data+'**/*.json')
	  .pipe(gulp.dest(dist.data));
});

//clean the dist directory
gulp.task('clean', function (done) {
  del([dist.path], done);
});

// process static files (for favicon.ico, touch icons, etc.)
gulp.task('public', function() {
  return gulp.src(src.public)
	  .pipe(gulp.dest(dist.path));
});

//build
gulp.task('build', $.sequence('clean','images','css','js','html','public'));


gulp.task('default', function () {
  gulp.start('serve');
});


function reload() {
  if (server) {
    return browserSync.reload({ stream: true });
  }
  return $.util.noop();
}