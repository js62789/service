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

export default class Service {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.configFactory = confit({
      basedir: path.join(__dirname, '..', 'config'),
      protocols: {
        path: handlers.path(path.join(__dirname, '..')),
        require: betterRequire(path.join(__dirname, '..'))
      }
    });
  }

  configure(callback) {
    this.configFactory.create(callback);
  }

  addConfiguration(basedir, callback) {
    const options = {
      basedir: path.join(basedir, 'config'),
      protocols: {
        path: handlers.path(basedir),
        require: betterRequire(basedir)
      }
    };
    confit(options).create((err, config) => {
      if (err) {
        callback(err);
        return;
      }

      this.configFactory.addOverride(config._store);
      callback();
    });
  }

  start(callback) {
    this.configure((err, config) => {
      if (err) {
        callback(err);
        return;
      }

      this.config = config;

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

      this.server.listen(config.get('port'), callback);
    });
  }

  stop(callback) {
    this.server.close(callback);
  }
}
