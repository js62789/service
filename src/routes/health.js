export default function(router) {
  router.get('/', function handleHealthRequest(req, res, next) {
    res.send({
      healthy: true
    });
  });
}
