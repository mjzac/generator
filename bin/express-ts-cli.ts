import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as util from "util";

import * as ejs from "ejs";
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
      .option('    --hbs', 'add handlebars engine support', this.renamedOption('--hbs', '--view=hbs'))
      .option('-H, --hogan', 'add hogan.js engine support', this.renamedOption('--hogan', '--view=hogan'))
      .option('-v, --view <engine>', 'add view <engine> support (dust|ejs|hbs|hjs|jade|pug|twig|vash) (defaults to jade)')
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
  private createApplication(name: string, path: string) {
    var wait = 5

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
      this.mkdir(path + '/public', () => {
        this.mkdir(path + '/public/javascripts')
        this.mkdir(path + '/public/images')
        this.mkdir(path + '/public/stylesheets', () => {
          switch (program.css) {
            case 'less':
              this.copyTemplate('css/style.less', path + '/public/stylesheets/style.less')
              break
            case 'stylus':
              this.copyTemplate('css/style.styl', path + '/public/stylesheets/style.styl')
              break
            case 'compass':
              this.copyTemplate('css/style.scss', path + '/public/stylesheets/style.scss')
              break
            case 'sass':
              this.copyTemplate('css/style.sass', path + '/public/stylesheets/style.sass')
              break
            default:
              this.copyTemplate('css/style.css', path + '/public/stylesheets/style.css')
              break
          }
          complete()
        })
      })

      this.mkdir(path + '/routes', () => {
        this.copyTemplate('js/routes/index.js', path + '/routes/index.js')
        this.copyTemplate('js/routes/users.js', path + '/routes/users.js')
        complete()
      })

      this.mkdir(path + '/views', () => {
        switch (program.view) {
          case 'dust':
            this.copyTemplate('dust/index.dust', path + '/views/index.dust')
            this.copyTemplate('dust/error.dust', path + '/views/error.dust')
            break
          case 'ejs':
            this.copyTemplate('ejs/index.ejs', path + '/views/index.ejs')
            this.copyTemplate('ejs/error.ejs', path + '/views/error.ejs')
            break
          case 'jade':
            this.copyTemplate('jade/index.jade', path + '/views/index.jade')
            this.copyTemplate('jade/layout.jade', path + '/views/layout.jade')
            this.copyTemplate('jade/error.jade', path + '/views/error.jade')
            break
          case 'hjs':
            this.copyTemplate('hogan/index.hjs', path + '/views/index.hjs')
            this.copyTemplate('hogan/error.hjs', path + '/views/error.hjs')
            break
          case 'hbs':
            this.copyTemplate('hbs/index.hbs', path + '/views/index.hbs')
            this.copyTemplate('hbs/layout.hbs', path + '/views/layout.hbs')
            this.copyTemplate('hbs/error.hbs', path + '/views/error.hbs')
            break
          case 'pug':
            this.copyTemplate('pug/index.pug', path + '/views/index.pug')
            this.copyTemplate('pug/layout.pug', path + '/views/layout.pug')
            this.copyTemplate('pug/error.pug', path + '/views/error.pug')
            break
          case 'twig':
            this.copyTemplate('twig/index.twig', path + '/views/index.twig')
            this.copyTemplate('twig/layout.twig', path + '/views/layout.twig')
            this.copyTemplate('twig/error.twig', path + '/views/error.twig')
            break
          case 'vash':
            this.copyTemplate('vash/index.vash', path + '/views/index.vash')
            this.copyTemplate('vash/layout.vash', path + '/views/layout.vash')
            this.copyTemplate('vash/error.vash', path + '/views/error.vash')
            break
        }
        complete()
      })

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
        case 'dust':
          app.locals.modules.adaro = 'adaro'
          app.locals.view = {
            engine: 'dust',
            render: 'adaro.dust()'
          }
          break
        default:
          app.locals.view = {
            engine: program.view
          }
          break
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
      }

      switch (program.view) {
        case 'dust':
          pkg.dependencies['adaro'] = '~1.0.4'
          break
        case 'jade':
          pkg.dependencies['jade'] = '~1.11.0'
          break
        case 'ejs':
          pkg.dependencies['ejs'] = '~2.5.6'
          break
        case 'hjs':
          pkg.dependencies['hjs'] = '~0.0.6'
          break
        case 'hbs':
          pkg.dependencies['hbs'] = '~4.0.1'
          break
        case 'pug':
          pkg.dependencies['pug'] = '~2.0.0-beta11'
          break
        case 'twig':
          pkg.dependencies['twig'] = '~0.10.3'
          break
        case 'vash':
          pkg.dependencies['vash'] = '~0.12.2'
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
      this.write(path + '/app.js', app.render())
      this.mkdir(path + '/bin', () => {
        this.write(path + '/bin/www', www.render(), MODE_0755)
        complete()
      })

      if (program.git) {
        this.copyTemplate('js/gitignore', path + '/.gitignore')
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
      this.warning('the default view engine will not be jade in future releases\n' +
        "use `--view=jade' or `--help' for additional options")
      program.view = 'jade'
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