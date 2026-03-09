'use strict';

var express = require('express');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var methodOverride = require('method-override');
var compression = require('compression');
var path = require('path');
var mongoose = require('mongoose');

// Config + models must be loaded before routes (same order as test/db/setup.js)
var config = require('../../config/config');
config.load();
require('../../model/history');
require('../../model/binder');
require('../../model/user');
require('../../model/form');
require('../../model/released-form');
require('../../model/traveler');

var auth = require('../../lib/auth');

// ── helpers ──────────────────────────────────────────────────────────────────

function buildApp() {
  var app = express();
  app.set('views', path.join(__dirname, '../../views'));
  app.set('view engine', 'jade');
  app.enable('strict routing');
  app.locals.orgName = config.app.org_name || 'Test Org';
  app.use(compression());
  app.use(methodOverride());
  app.use(cookieParser());
  app.use(
    expressSession({
      secret: 'test_secret',
      resave: false,
      saveUninitialized: false,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(auth.proxied);
  app.use(auth.sessionLocals);

  require('../../routes/main')(app);
  require('../../routes/form')(app);
  require('../../routes/form-management')(app);
  require('../../routes/traveler')(app);
  require('../../routes/binder')(app);
  require('../../routes/report')(app);
  require('../../routes/admin')(app);
  require('../../routes/user')(app);
  require('../../routes/group')(app);
  require('../../routes/profile')(app);
  require('../../routes/device')(app);
  require('../../routes/ldaplogin')(app);
  require('../../routes/doc')(app);

  return app;
}

// ── 1. Unauthenticated app (real ensureAuthenticated) ────────────────────────
var unauthApp = buildApp();

// ── 2. Stub auth, then build authenticated app ───────────────────────────────
auth.ensureAuthenticated = function testAuth(req, res, next) {
  req.session.userid = req.session.userid || 'testuser';
  req.session.username = req.session.username || 'Test User';
  req.session.roles = req.session.roles || [];
  next();
};
var authedApp = buildApp();

// ── 3. API app (Basic auth; no session stubbing needed) ──────────────────────
var apiApp = express();
apiApp.enable('strict routing');
apiApp.use(express.json());
apiApp.use(express.urlencoded({ extended: true }));
apiApp.use(auth.basicAuth);
require('../../routes/api')(apiApp);

// ── DB lifecycle (mirrors test/db/setup.js) ──────────────────────────────────
var mongoConfig = config.mongo;
var mongoHost = mongoConfig.server_address || 'localhost';
var mongoPort = mongoConfig.server_port || '27017';
var TEST_DB = 'mongodb://' + mongoHost + ':' + mongoPort + '/traveler_test';
mongoose.set('strictQuery', true);
var mongoOptions = { maxPoolSize: 2, connectTimeoutMS: 30000 };
if (mongoConfig.username) {
  mongoOptions.user = mongoConfig.username;
  mongoOptions.pass = mongoConfig.password;
  mongoOptions.authSource = 'traveler_test';
}
if (mongoConfig.auth) {
  mongoOptions.auth = mongoConfig.auth;
}

function connect(done) {
  if (mongoose.connection.readyState === 1) return done();
  mongoose
    .connect(TEST_DB, mongoOptions)
    .then(function() {
      done();
    })
    .catch(done);
}

function disconnect(done) {
  mongoose.connection
    .close()
    .then(function() {
      done();
    })
    .catch(done);
}

module.exports = { unauthApp, authedApp, apiApp, connect, disconnect };
