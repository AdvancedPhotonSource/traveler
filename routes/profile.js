var mongoose = require('mongoose');
var User = mongoose.model('User');
var auth = require('../lib/auth');
var config = require('../config/config.js');
var routesUtilities = require('../utilities/routes.js');
var generateApiKey = require('generate-api-key');

var apiExpirationDays = 30;
if (config.api.api_key_expiration_in_days) {
  apiExpirationDays = config.api.api_key_expiration_in_days;
}

module.exports = function(app) {
  app.get('/profile', auth.ensureAuthenticated, function(req, res) {
    // render the profile page
    User.findOne({
      _id: req.session.userid,
    }).exec(function(err, user) {
      if (err) {
        console.error(err);
        return res.status(500).send('something is wrong with the DB.');
      }
      return res.render(
        'profile',
        routesUtilities.getRenderObject(req, {
          user: user,
        })
      );
    });
  });

  // user update her/his profile. This is a little different from the admin update the user's roles.
  app.put('/profile', auth.ensureAuthenticated, function(req, res) {
    if (!req.is('json')) {
      return res.status(415).json({
        error: 'json request expected.',
      });
    }
    User.findOneAndUpdate(
      {
        _id: req.session.userid,
      },
      {
        subscribe: req.body.subscribe,
      }
    ).exec(function(err, user) {
      if (err) {
        console.error(err);
        return res.status(500).json({
          error: err.message,
        });
      }
      return res.status(204).send();
    });
  });

  app.put('/profile/apikey', auth.ensureAuthenticated, function(req, res) {
    return updateApiKey(req, res, true);
  });

  app.delete('/profile/apikey', auth.ensureAuthenticated, function(req, res) {
    return updateApiKey(req, res, false);
  });

  function updateApiKey(req, res, create = True) {
    if (create) {
      generatedApiKey = generateApiKey();
      expiration = new Date();
      expiration.setDate(expiration.getDate() + apiExpirationDays);
    } else {
      generatedApiKey = undefined;
      expiration = undefined;
    }

    User.findOneAndUpdate(
      {
        _id: req.session.userid,
      },
      {
        apiKey: generatedApiKey,
        apiKeyExpiration: expiration,
      }
    ).exec(function(err, user) {
      if (err) {
        console.error(err);
        return res.status(500).json({
          error: err.message,
        });
      }
      return res.status(204).send();
    });
  }
};
