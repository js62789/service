import path from 'path';
import http from 'http';
import confit from 'confit';
import express from 'express';
import meddleware from 'meddleware';
import handlers from 'shortstop-handlers';

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

const confitOptions = rootdir => ({
  basedir: path.join(rootdir, 'config'),
  protocols: {
    path: handlers.path(rootdir),
    require: betterRequire(rootdir)
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
    this.addConfiguration(path.join(__dirname, '..'));
  }

  configFactories = []

  async configure() {
    const { configFactories } = this;
    const rootConfigFactory = configFactories.shift();
    const promises = configFactories.map(confitPromise);
    const configs = await Promise.all(promises);

    configs.forEach(config => {
      rootConfigFactory.addOverride(config._store);
    });

    const config = await confitPromise(rootConfigFactory);

    return config;
  }

  addConfiguration(rootdir) {
    const configFactory = confit(confitOptions(rootdir));
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
