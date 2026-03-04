/*global describe, it, before, after, beforeEach*/
'use strict';

require('chai').should();
var mongoose = require('mongoose');
var setup = require('./setup');
var FormError = require('../../lib/error').FormError;

var Form = mongoose.model('Form');
var FormFile = mongoose.model('FormFile');
var History = mongoose.model('History');

var COLLECTIONS = ['Form', 'FormFile', 'History'];

// Minimal valid HTML with one named input and a label
var SIMPLE_HTML =
  '<div class="control-group">' +
  '<label class="control-label"><span class="model-label">Temperature</span></label>' +
  '<input name="temperature" type="number" data-userkey="temp_key" />' +
  '</div>';

// HTML with two different inputs
var TWO_INPUT_HTML =
  '<div class="control-group">' +
  '<label class="control-label"><span class="model-label">Voltage</span></label>' +
  '<input name="voltage" type="number" data-userkey="voltage_key" />' +
  '</div>' +
  '<div class="control-group">' +
  '<label class="control-label"><span class="model-label">Notes</span></label>' +
  '<textarea name="notes"></textarea>' +
  '</div>';

// HTML with duplicate input names
var DUP_NAME_HTML = '<input name="dup" /><input name="dup" />';

// HTML with duplicate userkeys on different inputs
var DUP_USERKEY_HTML =
  '<input name="a" data-userkey="same_key" />' +
  '<input name="b" data-userkey="same_key" />';

// HTML with radio inputs sharing the same name and userkey (valid)
var RADIO_SAME_USERKEY_HTML =
  '<div class="control-group">' +
  '<label class="control-label"><span class="model-label">Choice</span></label>' +
  '<input name="choice" type="radio" value="yes" data-userkey="choice_key" />' +
  '<input name="choice" type="radio" value="no" data-userkey="choice_key" />' +
  '</div>';

// HTML with radio inputs sharing name but inconsistent userkeys (invalid)
var RADIO_DIFF_USERKEY_HTML =
  '<input name="choice" type="radio" value="yes" data-userkey="key_a" />' +
  '<input name="choice" type="radio" value="no" data-userkey="key_b" />';

describe('Form model - database acceptance', function() {
  before(function(done) {
    setup.connect(done);
  });
  after(function(done) {
    setup.disconnect(done);
  });
  beforeEach(function(done) {
    setup.clearCollections(COLLECTIONS, done);
  });

  describe('#create - pre-save hook', function() {
    it('should create a form with empty html and produce empty mapping/labels/types', function(done) {
      new Form({ title: 'Empty', html: '', createdBy: 'tester' }).save(function(
        err,
        doc
      ) {
        if (err) return done(err);
        doc.mapping.should.deep.equal({});
        doc.labels.should.deep.equal({});
        doc.types.should.deep.equal({});
        done();
      });
    });

    it('should parse html and populate mapping keyed by userkey', function(done) {
      new Form({ title: 'T1', html: SIMPLE_HTML, createdBy: 'tester' }).save(
        function(err, doc) {
          if (err) return done(err);
          doc.mapping.should.have.property('temp_key', 'temperature');
          done();
        }
      );
    });

    it('should parse html and populate labels keyed by input name', function(done) {
      new Form({ title: 'T2', html: SIMPLE_HTML, createdBy: 'tester' }).save(
        function(err, doc) {
          if (err) return done(err);
          doc.labels.should.have.property('temperature', 'Temperature');
          done();
        }
      );
    });

    it('should parse html and populate types keyed by input name', function(done) {
      new Form({ title: 'T3', html: SIMPLE_HTML, createdBy: 'tester' }).save(
        function(err, doc) {
          if (err) return done(err);
          doc.types.should.have.property('temperature', 'number');
          done();
        }
      );
    });

    it('should parse html with multiple inputs correctly', function(done) {
      new Form({ title: 'T4', html: TWO_INPUT_HTML, createdBy: 'tester' }).save(
        function(err, doc) {
          if (err) return done(err);
          doc.mapping.should.have.property('voltage_key', 'voltage');
          doc.labels.should.have.property('voltage', 'Voltage');
          doc.labels.should.have.property('notes', 'Notes');
          doc.types.should.have.property('voltage', 'number');
          // textarea has no type attribute so the value is not stored in MongoDB
          done();
        }
      );
    });

    it('should reject duplicate input names with FormError', function(done) {
      new Form({ title: 'Bad', html: DUP_NAME_HTML, createdBy: 'tester' }).save(
        function(err) {
          err.should.exist;
          (err instanceof FormError).should.be.true;
          err.status.should.equal(400);
          done();
        }
      );
    });

    it('should reject duplicate userkeys with FormError', function(done) {
      new Form({
        title: 'DupKey',
        html: DUP_USERKEY_HTML,
        createdBy: 'tester',
      }).save(function(err) {
        err.should.exist;
        (err instanceof FormError).should.be.true;
        done();
      });
    });

    it('should allow radio inputs sharing the same name with consistent userkey', function(done) {
      new Form({
        title: 'Radio',
        html: RADIO_SAME_USERKEY_HTML,
        createdBy: 'tester',
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.should.exist;
        doc.mapping.should.have.property('choice_key', 'choice');
        done();
      });
    });

    it('should reject radio inputs with inconsistent userkeys with FormError', function(done) {
      new Form({
        title: 'BadRadio',
        html: RADIO_DIFF_USERKEY_HTML,
        createdBy: 'tester',
      }).save(function(err) {
        err.should.exist;
        (err instanceof FormError).should.be.true;
        done();
      });
    });

    it('should create a form with formType normal', function(done) {
      new Form({ title: 'NormalForm', html: '', formType: 'normal' }).save(
        function(err, doc) {
          if (err) return done(err);
          doc.formType.should.equal('normal');
          done();
        }
      );
    });

    it('should create a form with formType discrepancy', function(done) {
      new Form({ title: 'DiscForm', html: '', formType: 'discrepancy' }).save(
        function(err, doc) {
          if (err) return done(err);
          doc.formType.should.equal('discrepancy');
          done();
        }
      );
    });

    it('should reject an invalid formType enum value', function(done) {
      new Form({ title: 'BadType', html: '', formType: 'invalid' }).save(
        function(err) {
          err.should.exist;
          done();
        }
      );
    });
  });

  describe('#read', function() {
    it('should find a form by _id', function(done) {
      new Form({ title: 'FindMe', html: '', createdBy: 'tester' }).save(
        function(err, saved) {
          if (err) return done(err);
          Form.findById(saved._id, function(err, doc) {
            if (err) return done(err);
            doc.should.exist;
            doc.title.should.equal('FindMe');
            done();
          });
        }
      );
    });

    it('should find forms by status', function(done) {
      var saves = [
        new Form({ title: 'Draft1', html: '', status: 0 }).save(),
        new Form({ title: 'Submitted1', html: '', status: 0.5 }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          Form.find({ status: 0 }, function(err, docs) {
            if (err) return done(err);
            docs.should.have.lengthOf(1);
            docs[0].title.should.equal('Draft1');
            done();
          });
        })
        .catch(done);
    });

    it('should find forms by createdBy', function(done) {
      var saves = [
        new Form({ title: 'A', html: '', createdBy: 'alice' }).save(),
        new Form({ title: 'B', html: '', createdBy: 'bob' }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          Form.find({ createdBy: 'alice' }, function(err, docs) {
            if (err) return done(err);
            docs.should.have.lengthOf(1);
            docs[0].title.should.equal('A');
            done();
          });
        })
        .catch(done);
    });

    it('should find non-archived forms', function(done) {
      var saves = [
        new Form({ title: 'Active', html: '', archived: false }).save(),
        new Form({ title: 'Archived', html: '', archived: true }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          Form.find({ archived: false }, function(err, docs) {
            if (err) return done(err);
            docs.should.have.lengthOf(1);
            docs[0].title.should.equal('Active');
            done();
          });
        })
        .catch(done);
    });
  });

  describe('#defaults', function() {
    it('should default status to 0 (draft)', function(done) {
      new Form({ title: 'Defaults', html: '' }).save(function(err, doc) {
        if (err) return done(err);
        doc.status.should.equal(0);
        done();
      });
    });

    it('should default archived to false', function(done) {
      new Form({ title: 'DefArch', html: '' }).save(function(err, doc) {
        if (err) return done(err);
        doc.archived.should.equal(false);
        done();
      });
    });

    it('should default formType to normal', function(done) {
      new Form({ title: 'DefType', html: '' }).save(function(err, doc) {
        if (err) return done(err);
        doc.formType.should.equal('normal');
        done();
      });
    });
  });

  describe('#update - status transitions', function() {
    it('should transition status from 0 to 0.5 (submit for release)', function(done) {
      new Form({ title: 'Trans1', html: '' }).save(function(err, doc) {
        if (err) return done(err);
        doc.status.should.equal(0);
        Form.findByIdAndUpdate(
          doc._id,
          { $set: { status: 0.5 } },
          { new: true },
          function(err, updated) {
            if (err) return done(err);
            updated.status.should.equal(0.5);
            done();
          }
        );
      });
    });

    it('should transition status from 0.5 back to 0 (reject to draft)', function(done) {
      new Form({ title: 'Trans2', html: '', status: 0.5 }).save(function(
        err,
        doc
      ) {
        if (err) return done(err);
        Form.findByIdAndUpdate(
          doc._id,
          { $set: { status: 0 } },
          { new: true },
          function(err, updated) {
            if (err) return done(err);
            updated.status.should.equal(0);
            done();
          }
        );
      });
    });

    it('should archive a form by setting archived=true and archivedOn', function(done) {
      var archiveDate = new Date();
      new Form({ title: 'ToArchive', html: '' }).save(function(err, doc) {
        if (err) return done(err);
        Form.findByIdAndUpdate(
          doc._id,
          { $set: { archived: true, archivedOn: archiveDate, status: 2 } },
          { new: true },
          function(err, updated) {
            if (err) return done(err);
            updated.archived.should.equal(true);
            updated.status.should.equal(2);
            updated.archivedOn.getTime().should.equal(archiveDate.getTime());
            done();
          }
        );
      });
    });

    it('should exclude archived forms from { archived: false } query', function(done) {
      var saves = [
        new Form({ title: 'Live', html: '', archived: false }).save(),
        new Form({ title: 'Gone', html: '', archived: true }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          Form.find({ archived: false }, function(err, docs) {
            if (err) return done(err);
            docs.should.have.lengthOf(1);
            docs[0].title.should.equal('Live');
            done();
          });
        })
        .catch(done);
    });
  });

  describe('#sharedWith and #sharedGroup arrays', function() {
    it('should persist sharedWith subdocuments', function(done) {
      new Form({
        title: 'Shared',
        html: '',
        sharedWith: [{ _id: 'alice', username: 'alice', access: 0 }],
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.sharedWith.should.have.lengthOf(1);
        doc.sharedWith[0]._id.should.equal('alice');
        doc.sharedWith[0].access.should.equal(0);
        done();
      });
    });

    it('should persist sharedGroup subdocuments', function(done) {
      new Form({
        title: 'SharedGrp',
        html: '',
        sharedGroup: [{ _id: 'eng-grp', groupname: 'Engineering', access: 1 }],
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.sharedGroup.should.have.lengthOf(1);
        doc.sharedGroup[0]._id.should.equal('eng-grp');
        done();
      });
    });
  });

  describe('saveWithHistory()', function() {
    it('should create a History document when saving a form', function() {
      var f = new Form({ title: 'HistTest', html: '', createdBy: 'alice' });
      return f
        .saveWithHistory('alice')
        .then(function(saved) {
          saved.should.exist;
          return History.findOne({ i: saved._id });
        })
        .then(function(h) {
          h.should.exist;
          h.b.should.equal('alice');
          h.t.should.equal('Form');
        });
    });

    it('should push the History _id into form.__updates', function() {
      var f = new Form({ title: 'UpdTest', html: '', createdBy: 'bob' });
      return f
        .saveWithHistory('bob')
        .then(function(saved) {
          saved.__updates.should.have.lengthOf(1);
          return History.findById(saved.__updates[0]);
        })
        .then(function(h) {
          h.should.exist;
        });
    });

    it('should record title in History.c changes array', function() {
      var f = new Form({ title: 'TitleChange', html: '', createdBy: 'carol' });
      return f
        .saveWithHistory('carol')
        .then(function(saved) {
          return History.findOne({ i: saved._id });
        })
        .then(function(h) {
          var titles = h.c.filter(function(ch) {
            return ch.p === 'title';
          });
          titles.should.have.lengthOf(1);
          titles[0].v.should.equal('TitleChange');
        });
    });

    it('should create a new History document on each saveWithHistory call', function() {
      var f = new Form({ title: 'Multi', html: '', createdBy: 'dave' });
      return f
        .saveWithHistory('dave')
        .then(function(saved) {
          saved.set('title', 'Multi Updated');
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

    it('should resolve without creating History if no watched fields changed', function() {
      var f = new Form({ title: 'NoChange', html: '', createdBy: 'eve' });
      return f
        .saveWithHistory('eve')
        .then(function(saved) {
          // Re-save without changing any watched fields
          return saved.saveWithHistory('eve');
        })
        .then(function(result) {
          // Resolves with undefined when no changes detected
          (result === undefined).should.be.true;
        });
    });

    it('should increment _v when incrementVersion() is called before saving', function() {
      var f = new Form({ title: 'VerTest', html: '', createdBy: 'frank' });
      return f
        .saveWithHistory('frank')
        .then(function(saved) {
          var v0 = saved._v;
          saved.set('title', 'VerTest Updated');
          saved.incrementVersion(); // must be called explicitly
          return saved.saveWithHistory('frank');
        })
        .then(function(updated) {
          updated._v.should.be.above(0);
        });
    });
  });

  describe('FormFile model', function() {
    it('should create a FormFile linked to a Form by ObjectId', function(done) {
      new Form({ title: 'FileForm', html: '' }).save(function(err, form) {
        if (err) return done(err);
        new FormFile({
          form: form._id,
          uploadedBy: 'tester',
          inputType: 'file',
          file: {
            path: '/uploads/test.pdf',
            encoding: '7bit',
            mimetype: 'application/pdf',
          },
        }).save(function(err, ff) {
          if (err) return done(err);
          ff.form.toString().should.equal(form._id.toString());
          ff.file.mimetype.should.equal('application/pdf');
          done();
        });
      });
    });

    it('should find FormFiles by form reference', function(done) {
      new Form({ title: 'RefForm', html: '' }).save(function(err, form) {
        if (err) return done(err);
        new FormFile({ form: form._id, uploadedBy: 'tester' }).save(function(
          err
        ) {
          if (err) return done(err);
          FormFile.find({ form: form._id }, function(err, docs) {
            if (err) return done(err);
            docs.should.have.lengthOf(1);
            done();
          });
        });
      });
    });
  });
});
