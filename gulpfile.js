const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const browserSync = require('browser-sync');
const del = require('del');
const handlebars = require('gulp-compile-handlebars');
const nunjucks = require('gulp-nunjucks-html');
const path = require('path');
const yargs = require('yargs');
const svgSymbols = require('gulp-svg-symbols');

const PRODUCTION = !!(yargs.argv.production);

const src = {
  path: 'src/',
  data: 'data/',
  public: 'public/**/*',
  scripts: 'src/scripts/**/*',
  images: 'src/images/**/*',
  icons: 'icons/*.svg',
  styles: 'src/styles/*.scss',
  fonts: 'src/fonts',
  html: 'src/templates/**/*.html',
  layouts: 'src/templates/layouts/',
  includes: 'src/templates/includes/'
}

const dist = {
  path: 'dist',
  data: 'dist/api',
  scripts: 'dist/js',
  images: 'dist/img',
  icons: 'src/images',
  styles: 'dist/css',
  fonts: 'dist/fonts',
  html: 'dist/'
}

// environment setup
var server;
const date = new Date();

//data
const app = require('./' + src.data + 'app.json');

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
  gulp.watch(src.styles, ['css']);
  gulp.watch(src.scripts, ['js']);
  gulp.watch(src.images, ['images']);
});

// build static HTML files
gulp.task('html', function () {
  var options = {
      batch: [src.includes]
  }
  return gulp.src([src.html, '!'+src.includes+'*', '!'+src.layouts+'*'])
    .pipe($.data(getAppData))
    .pipe($.data(getPageData))
    .pipe(nunjucks({
      searchPaths: [src.layouts, src.includes],
      locals: {
        date: date
      }
    }))
    .pipe(gulp.dest(dist.path))
    .pipe(reload())
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
		.pipe(reload());
});

// process SASS
gulp.task('css', function () {
  return gulp.src(src.styles)
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      outputStyle: (PRODUCTION?'compressed':'expanded'),
      precision: 10,
      includePaths: [src.styles],
      errLogToConsole: true
    })
    .on('error', $.sass.logError))
    .pipe($.if(!PRODUCTION, $.cssnano()))
    .pipe($.postcss([
      require('autoprefixer-core')({browsers: ['last 2 versions', 'ie >= 9', 'and_chr >= 2.3']})
    ]))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(dist.styles))
    .pipe(reload());
});

// process images
gulp.task('images', function() {
	gulp.src(src.images)
		.pipe($.if(PRODUCTION, $.imagemin({
  		progressive: true,
  		svgoPlugins: [{cleanupIDs: true, removeTitle: true}]
		})))
		.pipe(gulp.dest(dist.images))
	  .pipe(reload());
});

/**
 * concatenate all svg files into one sprite
 */
gulp.task('icons', function () {
  return gulp.src(src.icons)
		.pipe($.imagemin({
  		progressive: true,
  		svgoPlugins: [{cleanupIDs: true, removeTitle: true}]
		}))
    .pipe(svgSymbols({
      templates: ['default-svg']
    }))
    .pipe($.rename(function(path) {
      path.basename = "icons"
    }))
    .pipe(gulp.dest(dist.icons));
});


// copy JSON files
gulp.task('data', function() {
  return gulp.src(src.data+'**/*.json')
	  .pipe(gulp.dest(dist.data));
});

gulp.task('clean', del.bind(null, [dist.path]));

// process static files (for favicon.ico, touch icons, etc.)
gulp.task('public', function() {
  return gulp.src(src.public)
	  .pipe(gulp.dest(dist.path));
});

//build
gulp.task('build', $.sequence('clean','public','data','images','css','js','html'));


gulp.task('default', function () {
  gulp.start('serve');
});


function reload() {
  if (server) {
    return browserSync.reload({ stream: true });
  }
  return $.util.noop();
}