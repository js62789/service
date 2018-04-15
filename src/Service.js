import path from 'path';
import http from 'http';
import confit from 'confit';
import express from 'express';
import meddleware from 'meddleware';
import handlers from 'shortstop-handlers';
import shortstopRegex from 'shortstop-regex';

function betterRequire(basepath) {
  const baseRequire = handlers.require(basepath);
  return function hashRequire(v) {
    const [moduleName, func] = v.split('#');
    const module = baseRequire(moduleName);
    if (func) {
      if (module[func]) {
        return module[func];
      }
      return baseRequire(v);
    }
    return module;
  };
}

const confitOptions = (rootdir, srcdir = path.join(rootdir, 'src')) => ({
  basedir: path.join(rootdir, 'config'),
  protocols: {
    path: handlers.path(rootdir),
    sourcepath: handlers.path(srcdir),
    require: betterRequire(rootdir),
    regex: shortstopRegex()
  }
});

const confitPromise = configFactory => new Promise((resolve, reject) => {
  configFactory.create((err, config) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(config);
  });
});

export default class Service {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.addConfiguration(path.join(__dirname, '..'), __dirname);
  }

  configFactories = []

  async configure() {
    const { configFactories } = this;
    const rootConfigFactory = configFactories.pop();
    const promises = configFactories.map(confitPromise);
    const configs = await Promise.all(promises);

    // Layer the configurations from most recently added
    configs.reverse().forEach(config => {
      rootConfigFactory.addDefault(config._store);
    });

    const config = await confitPromise(rootConfigFactory);

    return config;
  }

  addConfiguration(rootdir, srcdir) {
    const configFactory = confit(confitOptions(rootdir, srcdir));
    this.configFactories.push(configFactory);
  }

  async start() {
    const config = this.config = await this.configure();

    if (config.get('trustProxy')) {
      this.app.enable('trust proxy');
    }

    this.app.use((req, res, next) => {
      req.config = config;
      next();
    });

    const middleware = config.get('middleware');

    if (middleware) {
      this.app.use(meddleware(middleware));
    }

    return new Promise((resolve, reject) => {
      this.server.listen(config.get('port'), resolve);
    });
  }

  stop(callback) {
    this.server.close(callback);
  }
}
