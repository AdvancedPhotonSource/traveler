'use strict';

var mongoose = require('mongoose');

// Must load config before requiring models because form.js, traveler.js,
// and binder.js read appConfig.default_*_public_access at module load time.
var config = require('../../config/config');
config.load();

// Load models in dependency order:
//  1. history.js first - defines History model used by addHistory plugin
//  2. binder.js before traveler.js - traveler.js does top-level mongoose.model('Binder')
//  3. the rest can follow in any order
require('../../model/history');
require('../../model/binder');
require('../../model/user');
require('../../model/form');
require('../../model/released-form');
require('../../model/traveler');

var mongoConfig = config.mongo;
var mongoHost = mongoConfig.server_address || 'localhost';
var mongoPort = mongoConfig.server_port || '27017';
var TEST_DB = 'mongodb://' + mongoHost + ':' + mongoPort + '/traveler_test';

var mongoOptions = {
  poolSize: 2,
  connectTimeoutMS: 30000,
  keepAlive: 1,
};

// Use credentials from mongo.json if present, with authSource pointing to
// the production DB where the user account is defined.
if (mongoConfig.username) {
  mongoOptions.user = mongoConfig.username;
  mongoOptions.pass = mongoConfig.password;
  mongoOptions.authSource = 'traveler_test';
}
if (mongoConfig.auth) {
  mongoOptions.auth = mongoConfig.auth;
}

/**
 * Open the mongoose connection to traveler_test.
 * Safe to call when already connected (idempotent).
 * @param {Function} done - Mocha done callback
 */
function connect(done) {
  if (mongoose.connection.readyState === 1) {
    return done();
  }
  mongoose.connect(TEST_DB, mongoOptions, done);
}

/**
 * Close the mongoose connection.
 * @param {Function} done - Mocha done callback
 */
function disconnect(done) {
  mongoose.connection.close(done);
}

/**
 * Delete all documents from a list of Mongoose model names.
 * Uses deleteMany which bypasses middleware hooks (intentional for cleanup).
 * @param {string[]} modelNames - e.g. ['User', 'Group']
 * @param {Function} done - Mocha done callback
 */
function clearCollections(modelNames, done) {
  var promises = modelNames.map(function(name) {
    return mongoose.model(name).deleteMany({});
  });
  Promise.all(promises).then(function() {
    done();
  }, done);
}

module.exports = {
  connect: connect,
  disconnect: disconnect,
  clearCollections: clearCollections,
};
