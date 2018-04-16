let Service;

if (process.env.NODE_ENV === 'production') {
  Service = require('../build').Service;
} else {
  Service = require('../src').Service;
}

const service = new Service();

service.start().then(() => {
  console.log(`Listening on port ${service.config.get('port')}`);
});
