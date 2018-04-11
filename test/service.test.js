import assert from 'assert';
import Service from '../src/Service';

describe('Service', function() {
  describe('#addConfiguration()', function() {
    it('should add a config factory', function() {
      const service = new Service();
      const originalLength = service.configFactories.length;
      service.addConfiguration(__dirname);
      assert.equal(service.configFactories.length, originalLength + 1);
    });
  });
  describe('#configure()', function() {
    it('should extend default configuration', async function() {
      const service = new Service();
      service.addConfiguration(__dirname);
      const config = await service.configure();
      assert.equal(config.get('title'), 'Hello World');
      assert.equal(config.get('port'), 12345);
    });
  });
});
