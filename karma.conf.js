// Karma configuration

module.exports = function (config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'chai', 'sinon'],

        // list of files / patterns to load in the browser (sources + tests)
        files: [
			'bower_components/jquery/dist/jquery.js',
            'src/main/js/**/*.js',
            'src/test/unit/**/*.js'
        ],

        // list of files to exclude (so they don't get tested, usually third party libs)
        exclude: [
            'src/main/js/vendor/**/*'
        ],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            'src/main/js/**/*.js': ['coverage']
        },

        coverageReporter: {
            dir: 'target/test-results/coverage/',
            reporters: [
                {type: 'lcov'},
                {type: 'cobertura'}
            ]
        },

        junitReporter: {
            outputFile: 'target/test-results/unit-tests-results.xml',
            suite: 'mySuite'
        },

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['nyan', 'coverage', 'junit'],


        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['PhantomJS'], //Chrome


        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false
    });
};
