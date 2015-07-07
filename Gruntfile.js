module.exports = function (grunt) {

    //Cargo los módulos de grunt automáticamente
    require('load-grunt-tasks')(grunt);

    //Leo el fichero package.json
    var pkg = grunt.file.readJSON('package.json');

    // Configuration
    var config = {
        app: 'src/main',
        target: 'target',
        dist: 'target/' + pkg.version,
        test: 'src/test',
        targetTest: 'target/test-results'
    };

    // Project configuration.
    grunt.initConfig({
        config: config,

        // Watches files for changes and runs tasks based on the changed files
        watch: {
            js: {
                files: ['<%= config.app %>/js/{,*/}*.js'],
                tasks: [],
                options: {
                    livereload: true
                }
            },
            styles: {
                files: ['<%= config.app %>/css/{,*/}*.css'],
                tasks: [],
                options: {
                    livereload: true
                }
            },
            sass: {
                files: ['<%= config.app %>/sass/{,*/}*.scss'],
                tasks: ['sass'],
                options: {
                    livereload: true
                },
            },
            livereload: {
                options: {
                    livereload: '<%= connect.options.livereload %>'
                },
                files: [
                    '<%= config.app %>/{,*/}*.html',
                    '<%= config.app %>/{,*/}*.php',
                    '.tmp/css/{,*/}*.css',
                    '<%= config.app %>/images/{,*/}*'
                ]
            }
        },

        // Grunt server configuration
        connect: {
            options: {
                port: 9001,
                open: true,
                livereload: 35702,
                // Change this to '0.0.0.0' to access the server from outside
                hostname: 'localhost'
            },
            livereload: {
                options: {
                    middleware: function (connect) {
                        return [
                            connect.static('.tmp'),
                            connect().use('/bower_components', connect.static('./bower_components')),
                            connect.static(config.app)
                        ];
                    }
                }
            },
            dist: {
                options: {
                    base: '<%= config.dist %>',
                    livereload: false
                }
            }
        },

        // PHP server
        php: {
            dev: {
                options: {
                    // Change this to '0.0.0.0' to access the server from outside
                    hostname: '127.0.0.1',
                    base: '<%= config.app %>',
                    port: 9002,
                    open: true,
                    keepalive: true
                }
            }
        },

        // Karma test runner config
        karma: {
            options: {
                configFile: 'karma.conf.js'
            },
            singlerun: {
                singleRun: true,
                reporters: ['nyan']
            },
            report: {
                singleRun: true,
                reporters: ['progress', 'coverage', 'junit']
            },
            dev: {
                reporters: ['nyan']
            }
        },

        casper: {
            functional: {
                options: {
                    test: true
                },
                files: {
                    '<%= config.targetTest %>/functional-tests-results.xml': ['<%= config.test %>/functional/functionalTests.js']
                }
            }
        },

        jshint: {
            options: {
                jshintrc: '.jshintrc',
                ignores: ['<%= config.app %>/js/vendor/**/*'],
                reporter: require('jshint-smart'),
                verbose: false
            },
            all: {
                files: {
                    src: ['<%= config.app %>/js/**/*.js']
                }
            }
        },
        jscs: {
            options: {
                config: '.jscsrc',
                excludeFiles: ['<%= config.app %>/js/vendor/**/*'],
                reporter: require('jscs-stylish').path
            },
            all: {
                files: {
                    src: ['<%= config.app %>/js/**/*.js']
                }
            }
        },

        sass: {
            options: {
                sourceMap: true
            },
            dist: {
                files: {
                    '<%= config.app %>/css/materialize.css': '<%= config.app %>/sass/materialize.scss'
                }
            }
        },

        // Reads HTML for usemin blocks to enable smart builds that automatically
        // concat, minify and revision files. Creates configurations in memory so
        // additional tasks can operate on them
        useminPrepare: {            
            html: '<%= config.app %>/index.html',
			options: {
                dest: '<%= config.dist %>'
            }
        },

        // Performs rewrites based on rev and the useminPrepare configuration
        usemin: {
            options: {
                assetsDirs: [
                    '<%= config.dist %>',
                    '<%= config.dist %>/images',
                    '<%= config.dist %>/css'
                ]
            },
            html: ['<%= config.dist %>/{,*/}*.html'],
            css: ['<%= config.dist %>/css/{,*/}*.css']
        },

        // Empties folders to start fresh
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '.tmp',
                        '<%= config.target %>/**/*',
                        '!<%= config.target %>/test-results',
                        '!<%= config.target %>/test-results/**/*'
                    ]
                }]
            },
            server: '.tmp',
            end: ['<%= config.target %>/archive-tmp', '.tmp'],
            test: ['<%= config.target %>/test-results'],
            init: '<%= config.app %>/index.<%= grunt.config("input.type") %>'
        },

        // Copy files
        copy: {
            dist: {
                files: [
                    {
                        expand: true, cwd: '<%= config.app %>/',
                        src: ['*.html', '*.php'], dest: '<%= config.dist %>/',
                        filter: 'isFile'
                    },
                    {
                        expand: true, cwd: '<%= config.app %>/',
                        src: ['**/*', '!css/**/*', '!sass/**/*', '!sass'],
                        dest: '<%= config.dist %>/'
                    }
                ]
            }
        },

        // Concurrent tasks
        concurrent: {
            dev: {
                tasks: ['karma:dev', 'watch'],
                options: {logConcurrentOutput: true}
            },
            devphp: {
                tasks: ['php:dev', 'watch'],
                options: {logConcurrentOutput: true}
            }
        }
    });

    //********************* ALIAS ***************************

    // Starts a development server for webapps
    grunt.registerTask('dev', 'use --allow-remote for remote access', function (target) {
        if (grunt.option('allow-remote')) {
            grunt.config.set('connect.options.hostname', '0.0.0.0');
        }

        grunt.task.run([
            'clean:server',
            'connect:livereload',
            'concurrent:dev'
        ]);
    });

    // Starts a PHP server without livereload
    grunt.registerTask('dev-php', 'use --allow-remote for remote access', function () {
        if (grunt.option('allow-remote')) {
            grunt.config.set('php.dev.options.hostname', '0.0.0.0');
        }

        grunt.task.run([
            'clean:server',
            'concurrent:devphp'
        ]);
    });

    // Unit test runner
    grunt.registerTask('test', [
        'karma:singlerun',
        'clean:test'
    ]);

    // Functional test runner
    grunt.registerTask('test-functional', [
        'casper:functional'
    ]);

    // Test runner with coverage
    grunt.registerTask('test-coverage', [
        'clean:test',
        'karma:report'
    ]);

    // JShint + JSCS runner
    grunt.registerTask('sonar', '', function () {
        // Use the force option for all tasks declared in the previous line
        grunt.option('force', true);
        grunt.task.run([
            'jshint:all',
            'jscs:all'
        ]);
    });


    // Change version
    grunt.registerTask('version', [
        'prompt:version',
        'replace:version'
    ]);

    // simple build task
    grunt.registerTask('build', [
        'clean:dist',
        'sass',
        'copy:dist',
        'useminPrepare',
        'concat:generated',
        'cssmin:generated',
        'uglify:generated',
        'usemin',
        'clean:end'
    ]);

    // build tasks specific for PHP
    grunt.registerTask('build-php', '', function () {
        //Changes the html source files for php ones
        grunt.config.set('useminPrepare.html', '<%= config.app %>/index.php');
        grunt.config.set('usemin.html', ['<%= config.dist %>/{,*/}*.php']);

        grunt.task.run([
            'build'
        ]);
    });


    // Package the dist.
    // 'build' for HTML+Javascript project
    // 'build-php' for PHP project
    grunt.registerTask('default', ['build']);
};
