'use strict';

var supertest = require('supertest');
var chai = require('chai');
var expect = chai.expect;
var setup = require('./setup');

var unauthReq = supertest(setup.unauthApp);
var authedReq = supertest(setup.authedApp);
var apiReq = supertest(setup.apiApp);

describe('HTTP acceptance', function() {
  before(setup.connect);
  after(setup.disconnect);

  // ── Unauthenticated access ──────────────────────────────────────────────────
  describe('unauthenticated access', function() {
    it('GET / redirects to login', function(done) {
      unauthReq
        .get('/')
        .expect(302)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.headers.location).to.match(/ldaplogin|login/);
          done();
        });
    });

    it('GET /forms/ redirects to login', function(done) {
      unauthReq
        .get('/forms/')
        .expect(302)
        .end(done);
    });

    it('GET /travelers/ redirects to login', function(done) {
      unauthReq
        .get('/travelers/')
        .expect(302)
        .end(done);
    });
  });

  // ── Authenticated access ────────────────────────────────────────────────────
  describe('authenticated access', function() {
    it('GET / returns 200', function(done) {
      authedReq
        .get('/')
        .expect(200)
        .end(done);
    });

    it('GET /forms/ returns 200', function(done) {
      authedReq
        .get('/forms/')
        .expect(200)
        .end(done);
    });

    it('GET /forms/json returns JSON array', function(done) {
      authedReq
        .get('/forms/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          done();
        });
    });

    it('GET /travelers/ returns 200', function(done) {
      authedReq
        .get('/travelers/')
        .expect(200)
        .end(done);
    });

    it('GET /travelers/json returns JSON array', function(done) {
      authedReq
        .get('/travelers/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          done();
        });
    });

    it('GET /binders/ returns 200', function(done) {
      authedReq
        .get('/binders/')
        .expect(200)
        .end(done);
    });

    it('GET /binders/json returns JSON array', function(done) {
      authedReq
        .get('/binders/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          done();
        });
    });

    it('GET /admin/ returns 403 for user without admin role', function(done) {
      authedReq
        .get('/admin/')
        .expect(403)
        .end(done);
    });
  });

  // ── API authentication ──────────────────────────────────────────────────────
  describe('API authentication', function() {
    it('returns 401 with no credentials', function(done) {
      apiReq
        .get('/travelers/')
        .expect(401)
        .end(done);
    });
  });
});
