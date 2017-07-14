"use strict";
exports.__esModule = true;
var fs = require("fs");
var path = require("path");
var readline = require("readline");
var util = require("util");
var ejs = require("ejs");
var mkdirp = require("mkdirp");
var program = require("commander");
var sortedObject = require("sorted-object");
var MODE_0666 = parseInt('0666', 8);
var MODE_0755 = parseInt('0755', 8);
var _exit = process.exit;
var pkg = require('../package.json');
var version = pkg.version;
process.exit = exit;
function exit(code) {
    // flush output for Node.js Windows pipe bug
    // https://github.com/joyent/node/issues/6247 is just one bug example
    // https://github.com/visionmedia/mocha/issues/333 has a good discussion
    function done() {
        if (!(draining--))
            _exit(code);
    }
    var draining = 0;
    var streams = [process.stdout, process.stderr];
    ExpressTS.hasExited = true;
    streams.forEach(function (stream) {
        // submit empty write request and wait for completion
        draining += 1;
        stream.write('', done);
    });
    done();
}
var ExpressTS = (function () {
    function ExpressTS() {
        var _this = this;
        this._helpShown = true;
        this.around(program, 'optionMissingArgument', function (fn, args) {
            program.outputHelp();
            var self = _this;
            fn.apply(self, args);
            return { args: [], unknown: [] };
        });
        this.before(program, 'outputHelp', function () {
            _this._helpShown = true;
        });
        this.before(program, 'unknownOption', function () {
            _this.allowUnknownOption = _this._helpShown;
            if (!_this._helpShown) {
                program.outputHelp();
            }
        });
        program
            .version(version, '    --version')
            .usage('[options] [dir]')
            .option('-e, --ejs', 'add ejs engine support', this.renamedOption('--ejs', '--view=ejs'))
            .option('    --pug', 'add pug engine support', this.renamedOption('--pug', '--view=pug'))
            .option('    --hbs', 'add handlebars engine support', this.renamedOption('--hbs', '--view=hbs'))
            .option('-H, --hogan', 'add hogan.js engine support', this.renamedOption('--hogan', '--view=hogan'))
            .option('-v, --view <engine>', 'add view <engine> support (dust|ejs|hbs|hjs|jade|pug|twig|vash) (defaults to jade)')
            .option('-c, --css <engine>', 'add stylesheet <engine> support (less|stylus|compass|sass) (defaults to plain css)')
            .option('    --git', 'add .gitignore')
            .option('-f, --force', 'force on non-empty directory')
            .parse(process.argv);
        if (!ExpressTS.hasExited) {
            this.main();
        }
    }
    ExpressTS.prototype.around = function (pgm, method, callback) {
        if (method === void 0) { method = "optionMissingArgument"; }
        var old = pgm[method];
        pgm[method] = function () {
            var args = new Array(arguments.length);
            for (var i = 0; i < args.length; i++)
                args[i] = arguments[i];
            return callback.call(this, old, args);
        };
    };
    ExpressTS.prototype.before = function (pgm, method, callback) {
        if (method === void 0) { method = "optionMissingArgument"; }
        var old = pgm[method];
        pgm[method] = function () {
            callback.call(this);
            old.apply(this, arguments);
        };
    };
    ExpressTS.prototype.mkdir = function (path, fn) {
        mkdirp(path, MODE_0755, function (err) {
            if (err)
                throw err;
            console.log('   \x1b[36mcreate\x1b[0m : ' + path);
            fn && fn();
        });
    };
    ExpressTS.prototype.renamedOption = function (originalName, newName) {
        var _this = this;
        return function (val) {
            _this.warning(util.format("option `%s' has been renamed to `%s'", originalName, newName));
            return val;
        };
    };
    ExpressTS.prototype.warning = function (message) {
        console.error();
        message.split('\n').forEach(function (line) {
            console.error('  warning: %s', line);
        });
        console.error();
    };
    ExpressTS.prototype.createAppName = function (pathName) {
        return path.basename(pathName)
            .replace(/[^A-Za-z0-9.()!~*'-]+/g, '-')
            .replace(/^[-_.]+|-+$/g, '')
            .toLowerCase();
    };
    ExpressTS.prototype.emptyDirectory = function (path, fn) {
        fs.readdir(path, function (err, files) {
            if (err && err.code !== 'ENOENT')
                throw err;
            fn(!files || !files.length);
        });
    };
    /**
   * Prompt for confirmation on STDOUT/STDIN
   */
    ExpressTS.prototype.confirm = function (msg, callback) {
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(msg, function (input) {
            rl.close();
            callback(/^y|yes|ok|true$/i.test(input));
        });
    };
    /**
     * Copy file from template directory.
     */
    ExpressTS.prototype.copyTemplate = function (from, to) {
        from = path.join(__dirname, '..', 'templates', from);
        this.write(to, fs.readFileSync(from, 'utf-8'));
    };
    ExpressTS.prototype.createApplication = function (name, path) {
        var _this = this;
        var wait = 5;
        console.log();
        var complete = function () {
            if (--wait)
                return;
            var prompt = _this.launchedFromCmd() ? '>' : '$';
            console.log();
            console.log('   install dependencies:');
            console.log('     %s cd %s && npm install', prompt, path);
            console.log();
            console.log('   run the app:');
            if (_this.launchedFromCmd()) {
                console.log('     %s SET DEBUG=%s:* & npm start', prompt, name);
            }
            else {
                console.log('     %s DEBUG=%s:* npm start', prompt, name);
            }
            console.log();
        };
        // JavaScript
        var app = this.loadTemplate('js/app.js');
        var www = this.loadTemplate('js/www');
        // App name
        www.locals.name = name;
        // App modules
        app.locals.modules = Object.create(null);
        app.locals.uses = [];
        this.mkdir(path, function () {
            _this.mkdir(path + '/public', function () {
                _this.mkdir(path + '/public/javascripts');
                _this.mkdir(path + '/public/images');
                _this.mkdir(path + '/public/stylesheets', function () {
                    switch (program.css) {
                        case 'less':
                            _this.copyTemplate('css/style.less', path + '/public/stylesheets/style.less');
                            break;
                        case 'stylus':
                            _this.copyTemplate('css/style.styl', path + '/public/stylesheets/style.styl');
                            break;
                        case 'compass':
                            _this.copyTemplate('css/style.scss', path + '/public/stylesheets/style.scss');
                            break;
                        case 'sass':
                            _this.copyTemplate('css/style.sass', path + '/public/stylesheets/style.sass');
                            break;
                        default:
                            _this.copyTemplate('css/style.css', path + '/public/stylesheets/style.css');
                            break;
                    }
                    complete();
                });
            });
            _this.mkdir(path + '/routes', function () {
                _this.copyTemplate('js/routes/index.js', path + '/routes/index.js');
                _this.copyTemplate('js/routes/users.js', path + '/routes/users.js');
                complete();
            });
            _this.mkdir(path + '/views', function () {
                switch (program.view) {
                    case 'dust':
                        _this.copyTemplate('dust/index.dust', path + '/views/index.dust');
                        _this.copyTemplate('dust/error.dust', path + '/views/error.dust');
                        break;
                    case 'ejs':
                        _this.copyTemplate('ejs/index.ejs', path + '/views/index.ejs');
                        _this.copyTemplate('ejs/error.ejs', path + '/views/error.ejs');
                        break;
                    case 'jade':
                        _this.copyTemplate('jade/index.jade', path + '/views/index.jade');
                        _this.copyTemplate('jade/layout.jade', path + '/views/layout.jade');
                        _this.copyTemplate('jade/error.jade', path + '/views/error.jade');
                        break;
                    case 'hjs':
                        _this.copyTemplate('hogan/index.hjs', path + '/views/index.hjs');
                        _this.copyTemplate('hogan/error.hjs', path + '/views/error.hjs');
                        break;
                    case 'hbs':
                        _this.copyTemplate('hbs/index.hbs', path + '/views/index.hbs');
                        _this.copyTemplate('hbs/layout.hbs', path + '/views/layout.hbs');
                        _this.copyTemplate('hbs/error.hbs', path + '/views/error.hbs');
                        break;
                    case 'pug':
                        _this.copyTemplate('pug/index.pug', path + '/views/index.pug');
                        _this.copyTemplate('pug/layout.pug', path + '/views/layout.pug');
                        _this.copyTemplate('pug/error.pug', path + '/views/error.pug');
                        break;
                    case 'twig':
                        _this.copyTemplate('twig/index.twig', path + '/views/index.twig');
                        _this.copyTemplate('twig/layout.twig', path + '/views/layout.twig');
                        _this.copyTemplate('twig/error.twig', path + '/views/error.twig');
                        break;
                    case 'vash':
                        _this.copyTemplate('vash/index.vash', path + '/views/index.vash');
                        _this.copyTemplate('vash/layout.vash', path + '/views/layout.vash');
                        _this.copyTemplate('vash/error.vash', path + '/views/error.vash');
                        break;
                }
                complete();
            });
            // CSS Engine support
            switch (program.css) {
                case 'less':
                    app.locals.modules.lessMiddleware = 'less-middleware';
                    app.locals.uses.push("lessMiddleware(path.join(__dirname, 'public'))");
                    break;
                case 'stylus':
                    app.locals.modules.stylus = 'stylus';
                    app.locals.uses.push("stylus.middleware(path.join(__dirname, 'public'))");
                    break;
                case 'compass':
                    app.locals.modules.compass = 'node-compass';
                    app.locals.uses.push("compass({ mode: 'expanded' })");
                    break;
                case 'sass':
                    app.locals.modules.sassMiddleware = 'node-sass-middleware';
                    app.locals.uses.push("sassMiddleware({\n  src: path.join(__dirname, 'public'),\n  dest: path.join(__dirname, 'public'),\n  indentedSyntax: true, // true = .sass and false = .scss\n  sourceMap: true\n})");
                    break;
            }
            // Template support
            switch (program.view) {
                case 'dust':
                    app.locals.modules.adaro = 'adaro';
                    app.locals.view = {
                        engine: 'dust',
                        render: 'adaro.dust()'
                    };
                    break;
                default:
                    app.locals.view = {
                        engine: program.view
                    };
                    break;
            }
            // package.json
            var pkg = {
                name: name,
                version: '0.0.0',
                private: true,
                scripts: {
                    start: 'node ./bin/www'
                },
                dependencies: {
                    'body-parser': '~1.17.1',
                    'cookie-parser': '~1.4.3',
                    'debug': '~2.6.3',
                    'express': '~4.15.2',
                    'morgan': '~1.8.1',
                    'serve-favicon': '~2.4.2'
                }
            };
            switch (program.view) {
                case 'dust':
                    pkg.dependencies['adaro'] = '~1.0.4';
                    break;
                case 'jade':
                    pkg.dependencies['jade'] = '~1.11.0';
                    break;
                case 'ejs':
                    pkg.dependencies['ejs'] = '~2.5.6';
                    break;
                case 'hjs':
                    pkg.dependencies['hjs'] = '~0.0.6';
                    break;
                case 'hbs':
                    pkg.dependencies['hbs'] = '~4.0.1';
                    break;
                case 'pug':
                    pkg.dependencies['pug'] = '~2.0.0-beta11';
                    break;
                case 'twig':
                    pkg.dependencies['twig'] = '~0.10.3';
                    break;
                case 'vash':
                    pkg.dependencies['vash'] = '~0.12.2';
                    break;
            }
            // CSS Engine support
            switch (program.css) {
                case 'less':
                    pkg.dependencies['less-middleware'] = '~2.2.0';
                    break;
                case 'compass':
                    pkg.dependencies['node-compass'] = '0.2.3';
                    break;
                case 'stylus':
                    pkg.dependencies['stylus'] = '0.54.5';
                    break;
                case 'sass':
                    pkg.dependencies['node-sass-middleware'] = '0.9.8';
                    break;
            }
            // sort dependencies like npm(1)
            pkg.dependencies = sortedObject(pkg.dependencies);
            // write files
            _this.write(path + '/package.json', JSON.stringify(pkg, null, 2) + '\n');
            _this.write(path + '/app.js', app.render());
            _this.mkdir(path + '/bin', function () {
                _this.write(path + '/bin/www', www.render(), MODE_0755);
                complete();
            });
            if (program.git) {
                _this.copyTemplate('js/gitignore', path + '/.gitignore');
            }
            complete();
        });
    };
    /**
   * Determine if launched from cmd.exe
   */
    ExpressTS.prototype.launchedFromCmd = function () {
        return process.platform === 'win32' &&
            process.env._ === undefined;
    };
    /**
     * Load template file.
     */
    ExpressTS.prototype.loadTemplate = function (name) {
        var contents = fs.readFileSync(path.join(__dirname, '..', 'templates', (name + '.ejs')), 'utf-8');
        var locals = Object.create(null);
        function render() {
            return ejs.render(contents, locals);
        }
        return {
            locals: locals,
            render: render
        };
    };
    ExpressTS.prototype.write = function (path, str, mode) {
        fs.writeFileSync(path, str, { mode: mode || MODE_0666 });
        console.log('   \x1b[36mcreate\x1b[0m : ' + path);
    };
    /**
   * Main program.
   */
    ExpressTS.prototype.main = function () {
        var _this = this;
        // Path
        var destinationPath = program.args.shift() || '.';
        // App name
        var appName = this.createAppName(path.resolve(destinationPath)) || 'hello-world';
        // View engine
        if (program.view === undefined) {
            if (program.ejs)
                program.view = 'ejs';
            if (program.hbs)
                program.view = 'hbs';
            if (program.hogan)
                program.view = 'hjs';
            if (program.pug)
                program.view = 'pug';
        }
        // Default view engine
        if (program.view === undefined) {
            this.warning('the default view engine will not be jade in future releases\n' +
                "use `--view=jade' or `--help' for additional options");
            program.view = 'jade';
        }
        // Generate application
        this.emptyDirectory(destinationPath, function (empty) {
            if (empty || program.force) {
                _this.createApplication(appName, destinationPath);
            }
            else {
                _this.confirm('destination is not empty, continue? [y/N] ', function (ok) {
                    if (ok) {
                        process.stdin.end(); //destroy()
                        _this.createApplication(appName, destinationPath);
                    }
                    else {
                        console.error('aborting');
                        exit(1);
                    }
                });
            }
        });
    };
    ExpressTS.hasExited = false;
    return ExpressTS;
}());
var expressTS = new ExpressTS();
exports["default"] = expressTS;
