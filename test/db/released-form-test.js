/*global describe, it, before, after, beforeEach*/
'use strict';

require('chai').should();
var mongoose = require('mongoose');
var setup = require('./setup');

var ReleasedForm = mongoose.model('ReleasedForm');
var History = mongoose.model('History');

var COLLECTIONS = ['ReleasedForm', 'History'];

// Minimal formContent embedded document for the base field
var BASE_FORM_CONTENT = {
  html: '<input name="temp" type="number" data-userkey="temp_key" />',
  mapping: { temp_key: 'temp' },
  labels: { temp: 'Temperature' },
  types: { temp: 'number' },
  formType: 'normal',
  _v: 1,
};

var DISCREPANCY_CONTENT = {
  html: '<input name="disc_notes" type="text" />',
  mapping: {},
  labels: { disc_notes: 'Notes' },
  types: { disc_notes: 'text' },
  formType: 'discrepancy',
  _v: 1,
};

describe('ReleasedForm model - database acceptance', function() {
  before(function(done) {
    setup.connect(done);
  });
  after(function(done) {
    setup.disconnect(done);
  });
  beforeEach(function(done) {
    setup.clearCollections(COLLECTIONS, done);
  });

  describe('#create', function() {
    it('should default status to 1 (released)', function(done) {
      new ReleasedForm({
        title: 'RF1',
        releasedBy: 'tester',
        base: BASE_FORM_CONTENT,
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.status.should.equal(1);
        done();
      });
    });

    it('should default formType to normal', function(done) {
      new ReleasedForm({
        title: 'RF-Normal',
        base: BASE_FORM_CONTENT,
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.formType.should.equal('normal');
        done();
      });
    });

    it('should create a ReleasedForm with formType discrepancy', function(done) {
      new ReleasedForm({
        title: 'RF-Disc',
        formType: 'discrepancy',
        base: DISCREPANCY_CONTENT,
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.formType.should.equal('discrepancy');
        done();
      });
    });

    it('should create a ReleasedForm with formType normal_discrepancy', function(done) {
      new ReleasedForm({
        title: 'RF-NormDisc',
        formType: 'normal_discrepancy',
        base: BASE_FORM_CONTENT,
        discrepancy: DISCREPANCY_CONTENT,
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.formType.should.equal('normal_discrepancy');
        done();
      });
    });

    it('should reject an invalid formType enum value', function(done) {
      new ReleasedForm({
        title: 'RF-Bad',
        formType: 'invalid',
        base: BASE_FORM_CONTENT,
      }).save(function(err) {
        err.should.exist;
        done();
      });
    });

    it('should persist the base formContent embedded document', function(done) {
      new ReleasedForm({
        title: 'RF-Base',
        base: BASE_FORM_CONTENT,
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.base.should.exist;
        doc.base.html.should.equal(BASE_FORM_CONTENT.html);
        doc.base.mapping.should.deep.equal(BASE_FORM_CONTENT.mapping);
        done();
      });
    });

    it('should persist the discrepancy formContent for normal_discrepancy type', function(done) {
      new ReleasedForm({
        title: 'RF-ND',
        formType: 'normal_discrepancy',
        base: BASE_FORM_CONTENT,
        discrepancy: DISCREPANCY_CONTENT,
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.discrepancy.should.exist;
        doc.discrepancy.formType.should.equal('discrepancy');
        done();
      });
    });

    it('should persist the ver field', function(done) {
      new ReleasedForm({
        title: 'RF-Ver',
        base: BASE_FORM_CONTENT,
        ver: '1:0',
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.ver.should.equal('1:0');
        done();
      });
    });

    it('should start with _v=0 when no versioned fields are set', function(done) {
      new ReleasedForm({
        releasedBy: 'tester',
        base: BASE_FORM_CONTENT,
      }).save(function(err, doc) {
        if (err) return done(err);
        doc._v.should.equal(0);
        done();
      });
    });

    it('should start with _v=0 on creation (incrementVersion must be called explicitly)', function(done) {
      new ReleasedForm({
        title: 'Versioned',
        base: BASE_FORM_CONTENT,
      }).save(function(err, doc) {
        if (err) return done(err);
        doc._v.should.equal(0);
        done();
      });
    });
  });

  describe('#read', function() {
    it('should find a ReleasedForm by _id', function(done) {
      new ReleasedForm({
        title: 'FindMe',
        base: BASE_FORM_CONTENT,
      }).save(function(err, saved) {
        if (err) return done(err);
        ReleasedForm.findById(saved._id, function(err, doc) {
          if (err) return done(err);
          doc.should.exist;
          doc.title.should.equal('FindMe');
          done();
        });
      });
    });

    it('should find released forms by status=1', function(done) {
      var saves = [
        new ReleasedForm({
          title: 'Released',
          status: 1,
          base: BASE_FORM_CONTENT,
        }).save(),
        new ReleasedForm({
          title: 'Archived',
          status: 2,
          base: BASE_FORM_CONTENT,
        }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          ReleasedForm.find({ status: 1 }, function(err, docs) {
            if (err) return done(err);
            docs.should.have.lengthOf(1);
            docs[0].title.should.equal('Released');
            done();
          });
        })
        .catch(done);
    });

    it('should find archived forms by status=2', function(done) {
      var saves = [
        new ReleasedForm({
          title: 'RF-R',
          status: 1,
          base: BASE_FORM_CONTENT,
        }).save(),
        new ReleasedForm({
          title: 'RF-A',
          status: 2,
          base: BASE_FORM_CONTENT,
        }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          ReleasedForm.find({ status: 2 }, function(err, docs) {
            if (err) return done(err);
            docs.should.have.lengthOf(1);
            docs[0].title.should.equal('RF-A');
            done();
          });
        })
        .catch(done);
    });

    it('should find forms by formType', function(done) {
      var saves = [
        new ReleasedForm({
          title: 'NF',
          formType: 'normal',
          base: BASE_FORM_CONTENT,
        }).save(),
        new ReleasedForm({
          title: 'DF',
          formType: 'discrepancy',
          base: DISCREPANCY_CONTENT,
        }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          ReleasedForm.find({ formType: 'discrepancy' }, function(err, docs) {
            if (err) return done(err);
            docs.should.have.lengthOf(1);
            docs[0].title.should.equal('DF');
            done();
          });
        })
        .catch(done);
    });

    it('should find forms by tags using $in', function(done) {
      var saves = [
        new ReleasedForm({
          title: 'Tagged',
          base: BASE_FORM_CONTENT,
          tags: ['run1', 'sector27'],
        }).save(),
        new ReleasedForm({
          title: 'Untagged',
          base: BASE_FORM_CONTENT,
          tags: [],
        }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          ReleasedForm.find({ tags: { $in: ['sector27'] } }, function(
            err,
            docs
          ) {
            if (err) return done(err);
            docs.should.have.lengthOf(1);
            docs[0].title.should.equal('Tagged');
            done();
          });
        })
        .catch(done);
    });
  });

  describe('#update - status transition', function() {
    it('should transition status from 1 (released) to 2 (archived)', function(done) {
      var archiveDate = new Date();
      new ReleasedForm({
        title: 'ToArchive',
        base: BASE_FORM_CONTENT,
      }).save(function(err, doc) {
        if (err) return done(err);
        ReleasedForm.findByIdAndUpdate(
          doc._id,
          { $set: { status: 2, archivedOn: archiveDate, archivedBy: 'admin' } },
          { new: true },
          function(err, updated) {
            if (err) return done(err);
            updated.status.should.equal(2);
            updated.archivedOn.getTime().should.equal(archiveDate.getTime());
            updated.archivedBy.should.equal('admin');
            done();
          }
        );
      });
    });
  });

  describe('saveWithHistory()', function() {
    it('should create a History document when saving a new ReleasedForm', function() {
      var rf = new ReleasedForm({
        title: 'HistRF',
        releasedBy: 'alice',
        base: BASE_FORM_CONTENT,
      });
      return rf
        .saveWithHistory('alice')
        .then(function(saved) {
          saved.should.exist;
          return History.findOne({ i: saved._id });
        })
        .then(function(h) {
          h.should.exist;
          h.b.should.equal('alice');
          h.t.should.equal('ReleasedForm');
        });
    });

    it('should push History _id into __updates array', function() {
      var rf = new ReleasedForm({
        title: 'HistUpd',
        releasedBy: 'bob',
        base: BASE_FORM_CONTENT,
      });
      return rf
        .saveWithHistory('bob')
        .then(function(saved) {
          saved.__updates.should.have.lengthOf(1);
          return History.findById(saved.__updates[0]);
        })
        .then(function(h) {
          h.should.exist;
        });
    });

    it('should record title in History.c on creation', function() {
      var rf = new ReleasedForm({
        title: 'HistTitle',
        releasedBy: 'carol',
        base: BASE_FORM_CONTENT,
      });
      return rf
        .saveWithHistory('carol')
        .then(function(saved) {
          return History.findOne({ i: saved._id });
        })
        .then(function(h) {
          var titleChanges = h.c.filter(function(ch) {
            return ch.p === 'title';
          });
          titleChanges.should.have.lengthOf(1);
          titleChanges[0].v.should.equal('HistTitle');
        });
    });

    it('should create a new History document on status change', function() {
      var rf = new ReleasedForm({
        title: 'StatusHist',
        releasedBy: 'dave',
        base: BASE_FORM_CONTENT,
      });
      return rf
        .saveWithHistory('dave')
        .then(function(saved) {
          saved.set('status', 2);
          return saved.saveWithHistory('dave');
        })
        .then(function(updated) {
          updated.__updates.should.have.lengthOf(2);
          return new Promise(function(resolve, reject) {
            History.count({ i: updated._id }, function(err, count) {
              if (err) return reject(err);
              resolve(count);
            });
          });
        })
        .then(function(count) {
          count.should.equal(2);
        });
    });

    it('should increment _v when incrementVersion() is called before saving', function() {
      var rf = new ReleasedForm({
        title: 'VerRF',
        releasedBy: 'eve',
        base: BASE_FORM_CONTENT,
      });
      return rf
        .saveWithHistory('eve')
        .then(function(saved) {
          var v0 = saved._v;
          saved.set('title', 'VerRF Updated');
          saved.incrementVersion(); // must be called explicitly
          return saved.saveWithHistory('eve');
        })
        .then(function(updated) {
          updated._v.should.be.above(0);
        });
    });

    it('should resolve without creating History if no watched fields changed', function() {
      var rf = new ReleasedForm({
        title: 'NoChange',
        releasedBy: 'frank',
        base: BASE_FORM_CONTENT,
      });
      return rf
        .saveWithHistory('frank')
        .then(function(saved) {
          return saved.saveWithHistory('frank');
        })
        .then(function(result) {
          (result === undefined).should.be.true;
        });
    });
  });

  describe('#delete', function() {
    it('should delete a ReleasedForm by _id', function(done) {
      new ReleasedForm({
        title: 'ToDelete',
        base: BASE_FORM_CONTENT,
      }).save(function(err, doc) {
        if (err) return done(err);
        ReleasedForm.deleteOne({ _id: doc._id }, function(err, result) {
          if (err) return done(err);
          result.deletedCount.should.equal(1);
          done();
        });
      });
    });
  });
});
