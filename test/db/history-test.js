/*global describe, it, before, after, beforeEach*/
'use strict';

require('chai').should();
var mongoose = require('mongoose');
var setup = require('./setup');

var History = mongoose.model('History');
var Form = mongoose.model('Form');
var ReleasedForm = mongoose.model('ReleasedForm');

var COLLECTIONS = ['History', 'Form', 'ReleasedForm'];

var BASE_FORM_CONTENT = {
  html: '<input name="val" type="number" />',
  mapping: {},
  labels: { val: 'Value' },
  types: { val: 'number' },
  formType: 'normal',
  _v: 1,
};

describe('History model - database acceptance', function() {
  before(function(done) {
    setup.connect(done);
  });
  after(function(done) {
    setup.disconnect(done);
  });
  beforeEach(function(done) {
    setup.clearCollections(COLLECTIONS, done);
  });

  describe('#create - direct History document creation', function() {
    it('should save a History document with all required fields', function(done) {
      var oid = new mongoose.Types.ObjectId();
      new History({
        a: new Date(),
        b: 'testuser',
        t: 'Form',
        i: oid,
        c: [{ p: 'title', v: 'My Form' }],
      })
        .save()
        .then(function(doc) {
          doc.b.should.equal('testuser');
          doc.t.should.equal('Form');
          doc.i.toString().should.equal(oid.toString());
          doc.c.should.have.lengthOf(1);
          doc.c[0].p.should.equal('title');
          doc.c[0].v.should.equal('My Form');
          done();
        })
        .catch(done);
    });

    it('should use Date as type for the a field', function(done) {
      var now = new Date();
      var oid = new mongoose.Types.ObjectId();
      new History({ a: now, b: 'user1', t: 'Form', i: oid })
        .save()
        .then(function(doc) {
          (doc.a instanceof Date).should.be.true;
          done();
        })
        .catch(done);
    });

    it('should fail validation when required field b is missing', function(done) {
      var oid = new mongoose.Types.ObjectId();
      new History({ a: new Date(), t: 'Form', i: oid }).save().then(
        function() {
          done(new Error('Expected validation error'));
        },
        function(err) {
          err.should.exist;
          err.errors.should.have.property('b');
          done();
        }
      );
    });

    it('should fail validation when required field t is missing', function(done) {
      var oid = new mongoose.Types.ObjectId();
      new History({ a: new Date(), b: 'user1', i: oid }).save().then(
        function() {
          done(new Error('Expected validation error'));
        },
        function(err) {
          err.should.exist;
          err.errors.should.have.property('t');
          done();
        }
      );
    });

    it('should fail validation when required field i is missing', function(done) {
      new History({ a: new Date(), b: 'user1', t: 'Form' }).save().then(
        function() {
          done(new Error('Expected validation error'));
        },
        function(err) {
          err.should.exist;
          err.errors.should.have.property('i');
          done();
        }
      );
    });

    it('should store multiple change objects in the c array', function(done) {
      var oid = new mongoose.Types.ObjectId();
      new History({
        a: new Date(),
        b: 'editor',
        t: 'Form',
        i: oid,
        c: [
          { p: 'title', v: 'New Title' },
          { p: 'status', v: 0.5 },
          { p: 'description', v: 'Updated desc' },
        ],
      })
        .save()
        .then(function(doc) {
          doc.c.should.have.lengthOf(3);
          doc.c[1].p.should.equal('status');
          doc.c[1].v.should.equal(0.5);
          done();
        })
        .catch(done);
    });

    it('should store Mixed-type values in change.v', function(done) {
      var oid = new mongoose.Types.ObjectId();
      new History({
        a: new Date(),
        b: 'user1',
        t: 'Form',
        i: oid,
        c: [
          { p: 'numField', v: 42 },
          { p: 'boolField', v: true },
          { p: 'objField', v: { nested: 'value' } },
        ],
      })
        .save()
        .then(function(doc) {
          doc.c[0].v.should.equal(42);
          doc.c[1].v.should.equal(true);
          doc.c[2].v.should.deep.equal({ nested: 'value' });
          done();
        })
        .catch(done);
    });

    it('should create a History doc with empty c array', function(done) {
      var oid = new mongoose.Types.ObjectId();
      new History({ a: new Date(), b: 'user1', t: 'Form', i: oid })
        .save()
        .then(function(doc) {
          doc.c.should.have.lengthOf(0);
          done();
        })
        .catch(done);
    });
  });

  describe('#read', function() {
    it('should find History by _id', function(done) {
      var oid = new mongoose.Types.ObjectId();
      new History({ a: new Date(), b: 'user1', t: 'Form', i: oid })
        .save()
        .then(function(saved) {
          return History.findById(saved._id);
        })
        .then(function(doc) {
          doc.should.exist;
          done();
        })
        .catch(done);
    });

    it('should find History records by target document id (i field)', function(done) {
      var oid1 = new mongoose.Types.ObjectId();
      var oid2 = new mongoose.Types.ObjectId();
      var saves = [
        new History({ a: new Date(), b: 'u1', t: 'Form', i: oid1 }).save(),
        new History({ a: new Date(), b: 'u2', t: 'Form', i: oid1 }).save(),
        new History({ a: new Date(), b: 'u3', t: 'Form', i: oid2 }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          return History.find({ i: oid1 });
        })
        .then(function(docs) {
          docs.should.have.lengthOf(2);
          done();
        })
        .catch(done);
    });

    it('should find History records by model type (t field)', function(done) {
      var oid = new mongoose.Types.ObjectId();
      var saves = [
        new History({ a: new Date(), b: 'u1', t: 'Form', i: oid }).save(),
        new History({
          a: new Date(),
          b: 'u2',
          t: 'ReleasedForm',
          i: oid,
        }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          return History.find({ t: 'ReleasedForm' });
        })
        .then(function(docs) {
          docs.should.have.lengthOf(1);
          docs[0].t.should.equal('ReleasedForm');
          done();
        })
        .catch(done);
    });

    it('should find History records by author (b field)', function(done) {
      var oid = new mongoose.Types.ObjectId();
      var saves = [
        new History({ a: new Date(), b: 'alice', t: 'Form', i: oid }).save(),
        new History({ a: new Date(), b: 'bob', t: 'Form', i: oid }).save(),
        new History({ a: new Date(), b: 'alice', t: 'Form', i: oid }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          return History.find({ b: 'alice' });
        })
        .then(function(docs) {
          docs.should.have.lengthOf(2);
          done();
        })
        .catch(done);
    });
  });

  describe('addHistory plugin integration - Form', function() {
    it('should create a History document via Form.saveWithHistory()', function() {
      var f = new Form({ title: 'Plugin Test', html: '', createdBy: 'alice' });
      return f
        .saveWithHistory('alice')
        .then(function(saved) {
          return History.findOne({ i: saved._id, t: 'Form' });
        })
        .then(function(h) {
          h.should.exist;
          h.b.should.equal('alice');
        });
    });

    it('should link the History _id in form.__updates after saveWithHistory()', function() {
      var f = new Form({ title: 'LinkTest', html: '', createdBy: 'bob' });
      return f
        .saveWithHistory('bob')
        .then(function(saved) {
          saved.__updates.should.have.lengthOf(1);
          return History.findById(saved.__updates[0]);
        })
        .then(function(h) {
          h.should.exist;
          h.t.should.equal('Form');
        });
    });

    it('should record multiple field changes in a single History document', function() {
      var f = new Form({
        title: 'Multi Field',
        html: '',
        createdBy: 'carol',
        status: 0,
      });
      return f
        .saveWithHistory('carol')
        .then(function(saved) {
          return History.findOne({ i: saved._id });
        })
        .then(function(h) {
          // title and createdBy should both appear in c
          var paths = h.c.map(function(ch) {
            return ch.p;
          });
          paths.should.include('title');
          paths.should.include('createdBy');
        });
    });

    it('should create a new History document on each saveWithHistory() call', function() {
      var f = new Form({ title: 'Accumulate', html: '', createdBy: 'dave' });
      return f
        .saveWithHistory('dave')
        .then(function(saved) {
          saved.set('title', 'Accumulate v2');
          return saved.saveWithHistory('dave');
        })
        .then(function(updated) {
          return History.countDocuments({ i: updated._id });
        })
        .then(function(count) {
          count.should.equal(2);
        });
    });

    it('should accumulate multiple History _ids in form.__updates over time', function() {
      var f = new Form({ title: 'Accum2', html: '', createdBy: 'eve' });
      return f
        .saveWithHistory('eve')
        .then(function(saved) {
          saved.set('title', 'Accum2 v2');
          return saved.saveWithHistory('eve');
        })
        .then(function(updated) {
          updated.__updates.should.have.lengthOf(2);
        });
    });

    it('should resolve to undefined when no fields are modified', function() {
      var f = new Form({ title: 'Unchanged', html: '', createdBy: 'frank' });
      return f
        .saveWithHistory('frank')
        .then(function(saved) {
          return saved.saveWithHistory('frank');
        })
        .then(function(result) {
          (result === undefined).should.be.true;
        });
    });
  });

  describe('addVersion plugin integration - Form', function() {
    it('should start _v at 0 on creation (incrementVersion must be called explicitly)', function(done) {
      new Form({ title: 'HasTitle', html: '', createdBy: 'tester' })
        .save()
        .then(function(doc) {
          doc._v.should.equal(0);
          done();
        })
        .catch(done);
    });

    it('should increment _v when incrementVersion() is called for a modified title', function(done) {
      new Form({ html: '', createdBy: 'tester' })
        .save()
        .then(function(doc) {
          var v0 = doc._v; // 0
          doc.set('title', 'New Title');
          doc.incrementVersion();
          return doc.save().then(function(updated) {
            updated._v.should.be.above(v0);
            done();
          });
        })
        .catch(done);
    });

    it('should increment _v when incrementVersion() is called for a modified description', function(done) {
      new Form({ html: '', createdBy: 'tester' })
        .save()
        .then(function(doc) {
          var v0 = doc._v;
          doc.set('description', 'A new description');
          doc.incrementVersion();
          return doc.save().then(function(updated) {
            updated._v.should.be.above(v0);
            done();
          });
        })
        .catch(done);
    });

    it('should not increment _v when only a non-versioned field (owner) is modified', function(done) {
      new Form({ html: '', createdBy: 'tester' })
        .save()
        .then(function(doc) {
          var v0 = doc._v; // 0
          doc.set('owner', 'newowner');
          // incrementVersion() NOT called — owner is not in fieldsToVersion
          return doc.save().then(function(updated) {
            updated._v.should.equal(v0); // unchanged
            done();
          });
        })
        .catch(done);
    });
  });

  describe('History audit trail - multi-step form workflow', function() {
    it('should produce sequential History records for a form workflow', function() {
      var f = new Form({ title: 'Workflow', html: '', createdBy: 'operator' });
      var formId;

      return f
        .saveWithHistory('operator')
        .then(function(saved) {
          formId = saved._id;
          saved.set('title', 'Workflow Updated');
          return saved.saveWithHistory('operator');
        })
        .then(function(updated) {
          updated.set('status', 0.5);
          return updated.saveWithHistory('reviewer');
        })
        .then(function(reviewed) {
          reviewed.__updates.should.have.lengthOf(3);
          return History.find({ i: formId }).sort({ a: 1 });
        })
        .then(function(records) {
          records.should.have.lengthOf(3);
          // First record: initial creation with title
          var firstPaths = records[0].c.map(function(ch) {
            return ch.p;
          });
          firstPaths.should.include('title');
          // Second record: title update
          var secondPaths = records[1].c.map(function(ch) {
            return ch.p;
          });
          secondPaths.should.include('title');
          // Third record: status change by reviewer
          var thirdPaths = records[2].c.map(function(ch) {
            return ch.p;
          });
          thirdPaths.should.include('status');
          records[2].b.should.equal('reviewer');
        });
    });
  });
});
