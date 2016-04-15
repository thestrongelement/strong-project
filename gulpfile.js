const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const browserSync = require('browser-sync');
const del = require('del');
const handlebars = require('gulp-compile-handlebars');
const path = require('path');
const yargs = require('yargs');

const PRODUCTION = !!(yargs.argv.production);

const src = {
  path: 'src/',
  data: 'data/**/*',
  public: 'public/**/*',
  scripts: 'src/scripts',
  images: 'src/images/**/*',
  styles: 'src/styles/*.scss',
  fonts: 'src/fonts',
  html: 'src/templates',
  includes: 'src/templates/includes'
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


// process SASS
gulp.task('css', function () {
  return gulp.src(src.styles)
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      outputStyle: (PRODUCTION?'compressed':'nested'), // libsass doesn't support expanded yet
      precision: 10,
      includePaths: [src.styles],
      errLogToConsole: true
    })
    .on('error', $.sass.logError))
    .pipe($.postcss([
      require('autoprefixer-core')({browsers: ['last 2 versions', 'ie >= 9', 'and_chr >= 2.3']})
    ]))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(dist.styles))
    //.pipe(reload());
});

// process images
gulp.task('images', function() {
	gulp.src(src.images)
		.pipe($.if(PRODUCTION, $.imagemin({
  		progressive: true,
  		svgoPlugins: [{cleanupIDs: true, removeTitle: true}]
		})))
		.pipe(gulp.dest(dist.images))
	//	.pipe(reload());
});


// copy JSON files
gulp.task('data', function() {
  return gulp.src(src.data)
	  .pipe(gulp.dest(dist.data));
});

gulp.task('clean', del.bind(null, [dist.path]));

// process static files (for favicon.ico, touch icons, etc.)
gulp.task('public', function() {
  return gulp.src(src.public)
	  .pipe(gulp.dest(dist.path));
});

//build
gulp.task('build', $.sequence('clean','public','data','css','svg'));