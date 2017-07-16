#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as util from "util";

import * as ejs from "ejs";
import * as fse from "fs-extra";
import * as mkdirp from "mkdirp";
import * as program from "commander";
import * as sortedObject from "sorted-object";

const MODE_0666 = parseInt('0666', 8);
const MODE_0755 = parseInt('0755', 8);
const _exit = process.exit;
const pkg = require('../package.json');
const version = pkg.version;

process.exit = exit;

function exit(code?: number): never {
  // flush output for Node.js Windows pipe bug
  // https://github.com/joyent/node/issues/6247 is just one bug example
  // https://github.com/visionmedia/mocha/issues/333 has a good discussion
  function done() {
    if (!(draining--)) _exit(code)
  }

  var draining = 0
  var streams = [process.stdout, process.stderr]

  ExpressTS.hasExited = true

  streams.forEach(function (stream) {
    // submit empty write request and wait for completion
    draining += 1
    stream.write('', done)
  })

  done()
  return;
}
class ExpressTS {
  private _helpShown: boolean = true;
  private allowUnknownOption: boolean;
  static hasExited: boolean = false;
  constructor() {
    this.around(program, 'optionMissingArgument', (fn: Function, args: [any]) => {
      program.outputHelp();
      let self: any = this;
      fn.apply(self, args);
      return { args: [], unknown: [] };
    });

    this.before(program, 'outputHelp', () => {
      this._helpShown = true;
    });

    this.before(program, 'unknownOption', () => {
      this.allowUnknownOption = this._helpShown;
      if (!this._helpShown) {
        program.outputHelp();
      }
    });

    program
      .version(version, '    --version')
      .usage('[options] [dir]')
      .option('-e, --ejs', 'add ejs engine support', this.renamedOption('--ejs', '--view=ejs'))
      .option('    --pug', 'add pug engine support', this.renamedOption('--pug', '--view=pug'))
      .option('-v, --view <engine>', 'add view <engine> support (ejs|pug) (defaults to pug)')
      .option('-c, --css <engine>', 'add stylesheet <engine> support (less|stylus|compass|sass) (defaults to plain css)')
      .option('    --git', 'add .gitignore')
      .option('-f, --force', 'force on non-empty directory')
      .parse(process.argv)

    if (!ExpressTS.hasExited) {
      this.main();
    }
  }
  private around(pgm: program.CommanderStatic, method = "optionMissingArgument", callback: Function) {
    let old = pgm[method];
    pgm[method] = function () {
      let args = new Array(arguments.length);
      for (var i = 0; i < args.length; i++) args[i] = arguments[i];
      return callback.call(this, old, args);
    }
  }

  private before(pgm: program.CommanderStatic, method = "optionMissingArgument", callback: Function) {
    let old = pgm[method];
    pgm[method] = function () {
      callback.call(this);
      old.apply(this, arguments);
    }
  }
  private mkdir(path: string, fn?: Function) {
    mkdirp(path, MODE_0755, function (err) {
      if (err) throw err
      console.log('   \x1b[36mcreate\x1b[0m : ' + path)
      fn && fn()
    })
  }
  private renamedOption(originalName: string, newName: string) {
    return (val: string) => {
      this.warning(util.format("option `%s' has been renamed to `%s'", originalName, newName))
      return val
    }
  }

  private warning(message: string) {
    console.error()
    message.split('\n').forEach(function (line) {
      console.error('  warning: %s', line)
    })
    console.error()
  }

  private createAppName(pathName: string) {
    return path.basename(pathName)
      .replace(/[^A-Za-z0-9.()!~*'-]+/g, '-')
      .replace(/^[-_.]+|-+$/g, '')
      .toLowerCase()
  }

  private emptyDirectory(path: string, fn: Function) {
    fs.readdir(path, function (err, files) {
      if (err && err.code !== 'ENOENT') throw err
      fn(!files || !files.length)
    })
  }

  /**
 * Prompt for confirmation on STDOUT/STDIN
 */

  private confirm(msg: string, callback: Function) {
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question(msg, function (input) {
      rl.close()
      callback(/^y|yes|ok|true$/i.test(input))
    })
  }

  /**
   * Copy file from template directory.
   */

  private copyTemplate(from: string, to: string) {
    from = path.join(__dirname, '..', 'templates', from)
    this.write(to, fs.readFileSync(from, 'utf-8'))
  }

  private copyFolder(from: string, to: string) {
    from = path.join(__dirname, '..', 'templates', from);
    fse.copySync(from, to);
  }
  private createApplication(name: string, path: string) {
    var wait = 10

    console.log()
    let complete = () => {
      if (--wait) return
      var prompt = this.launchedFromCmd() ? '>' : '$'

      console.log()
      console.log('   install dependencies:')
      console.log('     %s cd %s && npm install', prompt, path)
      console.log()
      console.log('   run the app:')

      if (this.launchedFromCmd()) {
        console.log('     %s SET DEBUG=%s:* & npm start', prompt, name)
      } else {
        console.log('     %s DEBUG=%s:* npm start', prompt, name)
      }

      console.log()
    }

    // JavaScript
    var app = this.loadTemplate('js/app.js')
    var www = this.loadTemplate('js/www')

    // App name
    www.locals.name = name

    // App modules
    app.locals.modules = Object.create(null)
    app.locals.uses = []

    this.mkdir(path, () => {
      this.mkdir(path + '/src/public', () => {
        this.copyTemplate('ts/src/server.ts', path + '/src/server.ts');
        this.mkdir(path + '/src/public/js', () => {
          this.copyFolder('ts/src/public/js/', path + '/src/public/js/');
          complete();
        })
        this.mkdir(path + '/src/public/images')
        this.mkdir(path + '/src/public/fonts')
        this.mkdir(path + '/src/public/css', () => {
          this.copyFolder('ts/src/public/css/', path + '/src/public/css/');
          switch (program.css) {
            case 'less':
              this.copyTemplate('css/style.less', path + '/src/public/css/style.less')
              break
            case 'stylus':
              this.copyTemplate('css/style.styl', path + '/src/public/css/style.styl')
              break
            case 'compass':
              this.copyTemplate('css/style.scss', path + '/src/public/css/style.scss')
              break
            case 'sass':
              this.copyTemplate('css/style.sass', path + '/src/public/css/style.sass')
              break
            default:
              this.copyTemplate('css/style.css', path + '/src/public/css/style.css')
              break
          }
          complete()
        })
        complete()
      })
      this.copyFolder('ts/src/config', path + '/src/config');
      this.copyFolder('ts/src/types', path + '/src/types');
      this.mkdir(path + '/src/routes', () => {
        const theRoutes = ['account', 'api', 'contact', 'oauth', 'root'];
        theRoutes.map((aRoute) => {
          this.copyTemplate('ts/src/routes/' + aRoute + '.ts', path + '/src/routes/' + aRoute + '.ts')
        });
        complete()
      })
      this.mkdir(path + '/dist')
      this.mkdir(path + '/src/models', () => {
        const theModels = ['User'];
        theModels.map((aModel) => {
          this.copyTemplate('ts/src/models/' + aModel + '.ts', path + '/src/models/' + aModel + '.ts')
        });
        complete()
      })

      this.mkdir(path + '/views', () => {
        this.mkdir(path + '/views/account');
        this.mkdir(path + '/views/api');
        this.mkdir(path + '/views/partials');
        const rootViews: [string] = ['contact', 'home', 'layout'];
        const accountViews: [string] = ['forgot', 'login', 'profile', 'reset', 'signup'];
        const apiViews: [string] = ['facebook', 'index'];
        const partialViews: [string] = ['flash', 'footer', 'header'];
        const viewEngine: string = program.view;
        rootViews.map((aView) => {
          this.copyTemplate(viewEngine + '/' + aView + '.' + viewEngine, path + '/views/' + aView + '.' + viewEngine);
        });
        accountViews.map((aView) => {
          this.copyTemplate(viewEngine + '/account/' + aView + '.' + viewEngine, path + '/views/account/' + aView + '.' + viewEngine);
        });
        apiViews.map((aView) => {
          this.copyTemplate(viewEngine + '/api/' + aView + '.' + viewEngine, path + '/views/api/' + aView + '.' + viewEngine);
        });
        partialViews.map((aView) => {
          this.copyTemplate(viewEngine + '/partials/' + aView + '.' + viewEngine, path + '/views/partials/' + aView + '.' + viewEngine);
        });
        complete()
      })

      this.mkdir(path + '/src/controllers', () => {
        const theControllers = ['api', 'contact', 'home', 'user'];
        theControllers.map((aController) => {
          this.copyTemplate('ts/src/controllers/' + aController + '.ts', path + '/src/controllers/' + aController + '.ts')
        });
        complete()
      })



      this.mkdir(path + '/.vscode', () => {
        const vsConfFiles = ['launch', 'settings', 'tasks'];
        vsConfFiles.map((aConf) => {
          this.copyTemplate('ts/.vscode/' + aConf + '.json', path + '/.vscode/' + aConf + '.json');
        });
        complete();
      });

      this.mkdir(path + '/test', () => {
        const testFiles = ['api', 'app', 'contact', 'home', 'user'];
        testFiles.map((aTestFile) => {
          this.copyTemplate('ts/test/' + aTestFile + '.test.ts', path + '/test/' + aTestFile + '.test.ts');
        });
        complete();
      });

      this.copyTemplate('ts/copyStaticAssets.js', path + '/copyStaticAssets.js');
      // CSS Engine support
      switch (program.css) {
        case 'less':
          app.locals.modules.lessMiddleware = 'less-middleware'
          app.locals.uses.push("lessMiddleware(path.join(__dirname, 'public'))")
          break
        case 'stylus':
          app.locals.modules.stylus = 'stylus'
          app.locals.uses.push("stylus.middleware(path.join(__dirname, 'public'))")
          break
        case 'compass':
          app.locals.modules.compass = 'node-compass'
          app.locals.uses.push("compass({ mode: 'expanded' })")
          break
        case 'sass':
          app.locals.modules.sassMiddleware = 'node-sass-middleware'
          app.locals.uses.push("sassMiddleware({\n  src: path.join(__dirname, 'public'),\n  dest: path.join(__dirname, 'public'),\n  indentedSyntax: true, // true = .sass and false = .scss\n  sourceMap: true\n})")
          break
      }

      // Template support
      switch (program.view) {
        default:
          app.locals.view = {
            engine: program.view
          }
          break
      }

      // package.json
      var pkg: any = {
        "name": name,
        "version": "0.0.0",
        "description": "Node server written in TS.",
        "private": true,
        "scripts": {
          "start": "npm run build && npm run watch",
          "build": "npm run build-sass && npm run build-ts && npm run tslint && npm run copy-static-assets",
          "serve": "node dist/server.js",
          "watch": "concurrently -k -p \"[{name}]\" -n \"Sass,TypeScript,Node\" -c \"yellow.bold,cyan.bold,green.bold\" \"npm run watch-sass\" \"npm run watch-ts\" \"nodemon dist/server.js\"",
          "test": "jest --forceExit --coverage",
          "build-ts": "tsc",
          "watch-ts": "tsc -w",
          "build-sass": "node-sass src/public/css/main.scss dist/public/css/main.css",
          "watch-sass": "node-sass -w src/public/css/main.scss dist/public/css/main.css",
          "tslint": "tslint -c tslint.json -p tsconfig.json",
          "copy-static-assets": "node copyStaticAssets.js"
        },
        "jest": {
          "globals": {
            "__TS_CONFIG__": "tsconfig.json"
          },
          "moduleFileExtensions": [
            "ts",
            "js"
          ],
          "transform": {
            "^.+\\.(ts|tsx)$": "./node_modules/ts-jest/preprocessor.js"
          },
          "testMatch": [
            "**/test/**/*.test.(ts|js)"
          ],
          "testEnvironment": "node"
        },
        "dependencies": {
          "async": "^2.1.2",
          "bcrypt-nodejs": "^0.0.3",
          "body-parser": "^1.15.2",
          "compression": "^1.6.2",
          "connect-mongo": "^1.3.2",
          "dotenv": "^2.0.0",
          "errorhandler": "^1.4.3",
          "express": "^4.14.0",
          "express-flash": "^0.0.2",
          "express-session": "^1.14.2",
          "express-validator": "^3.1.3",
          "fbgraph": "^1.3.0",
          "lodash": "^4.17.4",
          "lusca": "^1.4.1",
          "mongoose": "^4.6.6",
          "morgan": "^1.7.0",
          "nodemailer": "^2.6.4",
          "passport": "0.3.2",
          "passport-facebook": "^2.1.1",
          "passport-local": "^1.0.0",
          "pug": "^2.0.0-beta11",
          "request": "^2.78.0"
        },
        "devDependencies": {
          "@types/async": "^2.0.40",
          "@types/body-parser": "^1.16.2",
          "@types/connect-mongo": "0.0.32",
          "@types/dotenv": "^2.0.20",
          "@types/errorhandler": "0.0.30",
          "@types/express": "^4.0.35",
          "@types/express-session": "0.0.32",
          "@types/jest": "^19.2.2",
          "@types/jquery": "^2.0.41",
          "@types/lodash": "^4.14.63",
          "@types/mongodb": "^2.1.43",
          "@types/mongoose": "^4.7.9",
          "@types/morgan": "^1.7.32",
          "@types/node": "^7.0.12",
          "@types/nodemailer": "^1.3.32",
          "@types/passport": "^0.3.3",
          "@types/passport-facebook": "^2.1.3",
          "@types/request": "0.0.42",
          "@types/supertest": "^2.0.0",
          "concurrently": "^3.4.0",
          "jest": "^19.0.2",
          "node-sass": "^4.5.2",
          "nodemon": "^1.11.0",
          "shelljs": "^0.7.7",
          "supertest": "^2.0.1",
          "ts-jest": "^19.0.8",
          "tslint": "^5.0.0",
          "typescript": "^2.2.2"
        }
      };

      switch (program.view) {
        case 'ejs':
          pkg.dependencies['ejs'] = '~2.5.6'
          break
        case 'pug':
          pkg.dependencies['pug'] = '^2.0.0-beta11'
          break
      }

      // CSS Engine support
      switch (program.css) {
        case 'less':
          pkg.dependencies['less-middleware'] = '~2.2.0'
          break
        case 'compass':
          pkg.dependencies['node-compass'] = '0.2.3'
          break
        case 'stylus':
          pkg.dependencies['stylus'] = '0.54.5'
          break
        case 'sass':
          pkg.dependencies['node-sass-middleware'] = '0.9.8'
          break
      }

      // sort dependencies like npm(1)
      pkg.dependencies = sortedObject(pkg.dependencies)

      // write files
      this.write(path + '/package.json', JSON.stringify(pkg, null, 2) + '\n')
      this.copyTemplate('ts/README.md', path + '/README.md')
      this.copyTemplate('ts/tslint.json', path + '/tslint.json')
      this.copyTemplate('ts/tsconfig.json', path + '/tsconfig.json');
      this.copyTemplate('ts/editorconfig', path + '/.editorconfig')
      this.copyTemplate('ts/env.example', path + '/.env.example')
      this.copyTemplate('ts/packageLock.json', path + '/package-lock.json')
      this.copyTemplate('ts/yarn.lock', path + '/yarn.lock')

      if (program.git) {
        this.copyTemplate('ts/gitignore', path + '/.gitignore')
      }

      complete()
    })
  }

  /**
 * Determine if launched from cmd.exe
 */

  private launchedFromCmd() {
    return process.platform === 'win32' &&
      process.env._ === undefined
  }

  /**
   * Load template file.
   */

  private loadTemplate(name: string) {
    var contents = fs.readFileSync(path.join(__dirname, '..', 'templates', (name + '.ejs')), 'utf-8')
    var locals = Object.create(null)

    function render() {
      return ejs.render(contents, locals)
    }

    return {
      locals: locals,
      render: render
    }
  }

  private write(path: string, str: string, mode?: number | undefined) {
    fs.writeFileSync(path, str, { mode: mode || MODE_0666 })
    console.log('   \x1b[36mcreate\x1b[0m : ' + path)
  }
  /**
 * Main program.
 */

  public main() {
    // Path
    var destinationPath = program.args.shift() || '.'

    // App name
    var appName = this.createAppName(path.resolve(destinationPath)) || 'hello-world'

    // View engine
    if (program.view === undefined) {
      if (program.ejs) program.view = 'ejs'
      if (program.hbs) program.view = 'hbs'
      if (program.hogan) program.view = 'hjs'
      if (program.pug) program.view = 'pug'
    }

    // Default view engine
    if (program.view === undefined) {
      this.warning('using default view engine pug.\n' +
        "use `--help' for additional options")
      program.view = 'pug'
    }

    // Generate application
    this.emptyDirectory(destinationPath, (empty: any) => {
      if (empty || program.force) {
        this.createApplication(appName, destinationPath)
      } else {
        this.confirm('destination is not empty, continue? [y/N] ', (ok: any) => {
          if (ok) {
            process.stdin.end(); //destroy()
            this.createApplication(appName, destinationPath)
          } else {
            console.error('aborting')
            exit(1)
          }
        })
      }
    })
  }
}
const expressTS = new ExpressTS();
export default expressTS;