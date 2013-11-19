var auth = require('../lib/auth');

var request = require('request');

module.exports = function(app) {
  app.get('/devices', function(req, res) {
    res.render('devices');
  });

  app.get('/devices/json', function(req, res) {
    request({
      url: 'http://ctlapp-wheezy-temp.nscl.msu.edu:8080/conf/rs/v0/component/physical',
      headers: {
        Accept: 'application/json'
      }
    }).pipe(res);
  });
};