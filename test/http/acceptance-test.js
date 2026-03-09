'use strict';

var supertest = require('supertest');
var chai = require('chai');
var expect = chai.expect;
var mongoose = require('mongoose');
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

  // ── Write operations ────────────────────────────────────────────────────────
  // These tests verify the Mongoose 9 pre-save middleware hooks work correctly
  // through the full HTTP stack (the gap not covered by DB-level tests alone).

  describe('write operations — form pre-save middleware', function() {
    var Form = mongoose.model('Form');

    var VALID_HTML =
      '<div class="control-group">' +
      '<label class="control-label"><span class="model-label">Temperature</span></label>' +
      '<input name="temperature" type="number" data-userkey="temp_key" />' +
      '</div>';

    afterEach(function(done) {
      Form.deleteMany({}).then(function() {
        done();
      }, done);
    });

    it('POST /forms/ creates a form with a title — returns 303 with Location', function(done) {
      authedReq
        .post('/forms/')
        .send({ title: 'HTTP Write Test Form' })
        .expect(303)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.headers.location).to.match(/\/forms\//);
          done();
        });
    });

    it('POST /forms/ with HTML — pre-save hook populates mapping and labels', function(done) {
      authedReq
        .post('/forms/')
        .send({ title: 'Form With Inputs', html: VALID_HTML })
        .expect(303)
        .end(function(err, res) {
          if (err) return done(err);
          var m = res.headers.location.match(/\/forms\/([^/]+)\//);
          if (!m)
            return done(
              new Error('no form id in Location: ' + res.headers.location)
            );
          authedReq
            .get('/forms/' + m[1] + '/json')
            .expect(200)
            .end(function(err2, res2) {
              if (err2) return done(err2);
              expect(res2.body.mapping).to.deep.equal({
                temp_key: 'temperature',
              });
              expect(res2.body.labels).to.deep.equal({
                temperature: 'Temperature',
              });
              done();
            });
        });
    });

    it('POST /forms/ with duplicate input names — pre-save hook throws FormError → 500', function(done) {
      authedReq
        .post('/forms/')
        .send({
          title: 'Bad Form',
          html: '<input name="dup" /><input name="dup" />',
        })
        .expect(500)
        .end(done);
    });
  });

  describe('write operations — traveler pre-save middleware', function() {
    var ReleasedForm = mongoose.model('ReleasedForm');
    var Traveler = mongoose.model('Traveler');
    var releasedFormId;

    beforeEach(function(done) {
      new ReleasedForm({
        title: 'HTTP Test Released Form',
        formType: 'normal',
        base: {
          html: '<input name="temp" type="text" />',
          mapping: {},
          labels: { temp: 'Temperature' },
          types: { temp: 'text' },
          formType: 'normal',
        },
        ver: '0',
      })
        .save()
        .then(function(doc) {
          releasedFormId = doc._id;
          done();
        })
        .catch(done);
    });

    afterEach(function(done) {
      Promise.all([ReleasedForm.deleteMany({}), Traveler.deleteMany({})])
        .then(function() {
          done();
        })
        .catch(done);
    });

    it('POST /travelers/ creates a traveler from a released form — pre-save hook runs — returns 201', function(done) {
      authedReq
        .post('/travelers/')
        .send({ form: releasedFormId.toString() })
        .expect(201)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.have.property('location');
          expect(res.body.location).to.match(/\/travelers\//);
          done();
        });
    });
  });

  describe('write operations — travelerData pre-save middleware', function() {
    var Traveler = mongoose.model('Traveler');
    var TravelerData = mongoose.model('TravelerData');
    var travelerId;

    beforeEach(function(done) {
      new Traveler({
        title: 'HTTP Data Test Traveler',
        status: 1,
        createdBy: 'testuser',
        forms: [
          {
            html: '<input name="temp" type="text" />',
            labels: { temp: 'Temperature' },
            types: { temp: 'text' },
            mapping: {},
          },
        ],
        totalInput: 1,
        finishedInput: 0,
        touchedInputs: [],
      })
        .save()
        .then(function(doc) {
          doc.activeForm = doc.forms[0]._id.toString();
          return doc.save();
        })
        .then(function(doc) {
          travelerId = doc._id.toString();
          done();
        })
        .catch(done);
    });

    afterEach(function(done) {
      Promise.all([Traveler.deleteMany({}), TravelerData.deleteMany({})])
        .then(function() {
          done();
        })
        .catch(done);
    });

    it('POST /travelers/:id/data/ with text value — pre-save hook allows it — returns 204', function(done) {
      authedReq
        .post('/travelers/' + travelerId + '/data/')
        .send({ name: 'temp', value: 'room temperature', type: 'text' })
        .expect(204)
        .end(done);
    });

    it('POST /travelers/:id/data/ with non-numeric value for number type — pre-save hook throws DataError → 400', function(done) {
      authedReq
        .post('/travelers/' + travelerId + '/data/')
        .send({ name: 'temp', value: 'not-a-number', type: 'number' })
        .expect(400)
        .end(done);
    });
  });
});
