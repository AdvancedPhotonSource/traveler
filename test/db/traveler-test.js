/*global describe, it, before, after, beforeEach*/
'use strict';

require('chai').should();
var mongoose = require('mongoose');
var setup = require('./setup');
var DataError = require('../../lib/error').DataError;

var Traveler = mongoose.model('Traveler');
var TravelerData = mongoose.model('TravelerData');
var TravelerNote = mongoose.model('TravelerNote');
var Log = mongoose.model('Log');

var COLLECTIONS = ['Traveler', 'TravelerData', 'TravelerNote', 'Log', 'Binder'];

describe('Traveler model - database acceptance', function() {
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
    it('should default status to 0 (initialized)', function(done) {
      new Traveler({ title: 'T1', createdBy: 'tester' })
        .save()
        .then(function(doc) {
          doc.status.should.equal(0);
          done();
        })
        .catch(done);
    });

    it('should default totalInput and finishedInput to 0', function(done) {
      new Traveler({ title: 'T2', createdBy: 'tester' })
        .save()
        .then(function(doc) {
          doc.totalInput.should.equal(0);
          doc.finishedInput.should.equal(0);
          done();
        })
        .catch(done);
    });

    it('should default archived to false', function(done) {
      new Traveler({ title: 'T3', createdBy: 'tester' })
        .save()
        .then(function(doc) {
          doc.archived.should.equal(false);
          done();
        })
        .catch(done);
    });

    it('should persist devices, locations, and tags arrays', function(done) {
      new Traveler({
        title: 'Arrays',
        devices: ['motor1', 'motor2'],
        locations: ['sector-27'],
        tags: ['run1', 'experiment'],
      })
        .save()
        .then(function(doc) {
          doc.devices.should.deep.equal(['motor1', 'motor2']);
          doc.locations.should.deep.equal(['sector-27']);
          doc.tags.should.deep.equal(['run1', 'experiment']);
          done();
        })
        .catch(done);
    });

    it('should persist referenceForm ObjectId', function(done) {
      var oid = new mongoose.Types.ObjectId();
      new Traveler({ title: 'RefForm', referenceForm: oid })
        .save()
        .then(function(doc) {
          doc.referenceForm.toString().should.equal(oid.toString());
          done();
        })
        .catch(done);
    });

    it('should set wasModifiedPaths on the document during pre-save', function(done) {
      new Traveler({
        title: 'PathTest',
        createdBy: 'tester',
        referenceForm: new mongoose.Types.ObjectId(),
      })
        .save()
        .then(function(doc) {
          doc.wasModifiedPaths.should.be.an('array');
          doc.wasModifiedPaths.should.include('title');
          done();
        })
        .catch(done);
    });
  });

  describe('#read', function() {
    it('should find a traveler by _id', function(done) {
      new Traveler({ title: 'FindMe' })
        .save()
        .then(function(saved) {
          return Traveler.findById(saved._id);
        })
        .then(function(doc) {
          doc.should.exist;
          doc.title.should.equal('FindMe');
          done();
        })
        .catch(done);
    });

    it('should find travelers by status', function(done) {
      var saves = [
        new Traveler({ title: 'Active', status: 1 }).save(),
        new Traveler({ title: 'Init', status: 0 }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          return Traveler.find({ status: 1 });
        })
        .then(function(docs) {
          docs.should.have.lengthOf(1);
          docs[0].title.should.equal('Active');
          done();
        })
        .catch(done);
    });

    it('should find non-archived travelers', function(done) {
      var saves = [
        new Traveler({ title: 'Live', archived: false }).save(),
        new Traveler({ title: 'Dead', archived: true }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          return Traveler.find({ archived: { $ne: true } });
        })
        .then(function(docs) {
          docs.should.have.lengthOf(1);
          docs[0].title.should.equal('Live');
          done();
        })
        .catch(done);
    });
  });

  describe('#update - status transitions', function() {
    var statusValues = [0, 1, 1.5, 2, 3, 4];

    statusValues.forEach(function(s) {
      it('should persist status value ' + s, function(done) {
        new Traveler({ title: 'StatusTest' })
          .save()
          .then(function(doc) {
            return Traveler.findByIdAndUpdate(
              doc._id,
              { $set: { status: s } },
              { new: true }
            );
          })
          .then(function(updated) {
            updated.status.should.equal(s);
            done();
          })
          .catch(done);
      });
    });

    it('should update totalInput and finishedInput', function(done) {
      new Traveler({ title: 'Progress' })
        .save()
        .then(function(doc) {
          return Traveler.findByIdAndUpdate(
            doc._id,
            { $set: { totalInput: 10, finishedInput: 7 } },
            { new: true }
          );
        })
        .then(function(updated) {
          updated.totalInput.should.equal(10);
          updated.finishedInput.should.equal(7);
          done();
        })
        .catch(done);
    });

    it('should push an input name into touchedInputs', function(done) {
      new Traveler({ title: 'Touched' })
        .save()
        .then(function(doc) {
          return Traveler.findByIdAndUpdate(
            doc._id,
            { $push: { touchedInputs: 'temperature' } },
            { new: true }
          );
        })
        .then(function(updated) {
          updated.touchedInputs.should.include('temperature');
          done();
        })
        .catch(done);
    });
  });

  describe('#delete', function() {
    it('should delete a traveler by _id', function(done) {
      new Traveler({ title: 'ToDelete' })
        .save()
        .then(function(doc) {
          return Traveler.deleteOne({ _id: doc._id });
        })
        .then(function(result) {
          result.deletedCount.should.equal(1);
          done();
        })
        .catch(done);
    });
  });

  describe('TravelerData model - pre-save validation', function() {
    it('should save inputType=text with any string value', function(done) {
      new TravelerData({
        name: 'notes',
        value: 'any text here',
        inputType: 'text',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(function(doc) {
          doc.value.should.equal('any text here');
          done();
        })
        .catch(done);
    });

    it('should save inputType=textarea with any string value', function(done) {
      new TravelerData({
        name: 'description',
        value: 'multi\nline\ntext',
        inputType: 'textarea',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(function(doc) {
          doc.value.should.equal('multi\nline\ntext');
          done();
        })
        .catch(done);
    });

    it('should save inputType=number with a numeric value', function(done) {
      new TravelerData({
        name: 'voltage',
        value: 3.14,
        inputType: 'number',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(function(doc) {
          doc.value.should.equal(3.14);
          done();
        })
        .catch(done);
    });

    it('should reject inputType=number with a non-numeric string value', function(done) {
      new TravelerData({
        name: 'voltage',
        value: 'not-a-number',
        inputType: 'number',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(
          function() {
            done(new Error('Expected validation error'));
          },
          function(err) {
            err.should.exist;
            (err instanceof DataError).should.be.true;
            done();
          }
        );
    });

    it('should save inputType=number with integer 0', function(done) {
      new TravelerData({
        name: 'count',
        value: 0,
        inputType: 'number',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(function(doc) {
          doc.value.should.equal(0);
          done();
        })
        .catch(done);
    });

    it('should save inputType=checkbox with boolean true', function(done) {
      new TravelerData({
        name: 'checked',
        value: true,
        inputType: 'checkbox',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(function(doc) {
          doc.value.should.equal(true);
          done();
        })
        .catch(done);
    });

    it('should save inputType=checkbox with boolean false', function(done) {
      new TravelerData({
        name: 'unchecked',
        value: false,
        inputType: 'checkbox',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(function(doc) {
          doc.value.should.equal(false);
          done();
        })
        .catch(done);
    });

    it('should reject inputType=checkbox with a non-boolean string value', function(done) {
      new TravelerData({
        name: 'checkbox1',
        value: 'on',
        inputType: 'checkbox',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(
          function() {
            done(new Error('Expected validation error'));
          },
          function(err) {
            err.should.exist;
            (err instanceof DataError).should.be.true;
            done();
          }
        );
    });

    it('should save inputType=date with yyyy-mm-dd format', function(done) {
      new TravelerData({
        name: 'startDate',
        value: '2024-03-15',
        inputType: 'date',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(function(doc) {
          doc.value.should.equal('2024-03-15');
          done();
        })
        .catch(done);
    });

    it('should reject inputType=date with mm/dd/yyyy format', function(done) {
      new TravelerData({
        name: 'startDate',
        value: '03/15/2024',
        inputType: 'date',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(
          function() {
            done(new Error('Expected validation error'));
          },
          function(err) {
            err.should.exist;
            (err instanceof DataError).should.be.true;
            done();
          }
        );
    });

    it('should reject inputType=date with a partial date string', function(done) {
      new TravelerData({
        name: 'badDate',
        value: '2024-3-5',
        inputType: 'date',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(
          function() {
            done(new Error('Expected validation error'));
          },
          function(err) {
            err.should.exist;
            (err instanceof DataError).should.be.true;
            done();
          }
        );
    });

    it('should save inputType=time with hh:mm format', function(done) {
      new TravelerData({
        name: 'startTime',
        value: '14:30',
        inputType: 'time',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(function(doc) {
          doc.value.should.equal('14:30');
          done();
        })
        .catch(done);
    });

    it('should reject inputType=time with h:mm format (missing leading zero)', function(done) {
      new TravelerData({
        name: 'badTime',
        value: '9:00',
        inputType: 'time',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(
          function() {
            done(new Error('Expected validation error'));
          },
          function(err) {
            err.should.exist;
            (err instanceof DataError).should.be.true;
            done();
          }
        );
    });

    it('should save inputType=datetime-local with yyyy-mm-ddThh:mm format', function(done) {
      new TravelerData({
        name: 'startDT',
        value: '2024-03-15T09:30',
        inputType: 'datetime-local',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(function(doc) {
          doc.value.should.equal('2024-03-15T09:30');
          done();
        })
        .catch(done);
    });

    it('should reject inputType=datetime-local with an invalid datetime string', function(done) {
      new TravelerData({
        name: 'badDT',
        value: '2024-03-15 09:30',
        inputType: 'datetime-local',
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(
          function() {
            done(new Error('Expected validation error'));
          },
          function(err) {
            err.should.exist;
            (err instanceof DataError).should.be.true;
            done();
          }
        );
    });
  });

  describe('TravelerNote model', function() {
    it('should create a note linked to a traveler by ObjectId', function(done) {
      new Traveler({ title: 'ForNote' })
        .save()
        .then(function(traveler) {
          return new TravelerNote({
            traveler: traveler._id,
            name: 'observations',
            value: 'All nominal',
            inputBy: 'tester',
            inputOn: new Date(),
          })
            .save()
            .then(function(note) {
              note.traveler.toString().should.equal(traveler._id.toString());
              note.value.should.equal('All nominal');
              done();
            });
        })
        .catch(done);
    });

    it('should find all notes for a traveler', function(done) {
      new Traveler({ title: 'MultiNote' })
        .save()
        .then(function(traveler) {
          var saves = [
            new TravelerNote({
              traveler: traveler._id,
              value: 'Note 1',
              inputBy: 'a',
              inputOn: new Date(),
            }).save(),
            new TravelerNote({
              traveler: traveler._id,
              value: 'Note 2',
              inputBy: 'a',
              inputOn: new Date(),
            }).save(),
          ];
          return Promise.all(saves)
            .then(function() {
              return TravelerNote.find({ traveler: traveler._id });
            })
            .then(function(notes) {
              notes.should.have.lengthOf(2);
              done();
            });
        })
        .catch(done);
    });
  });

  describe('Log model', function() {
    it('should create a Log with referenceForm and records array', function(done) {
      var formId = new mongoose.Types.ObjectId();
      new Log({
        referenceForm: formId,
        records: [
          { name: 'temperature', value: 98.6 },
          { name: 'pressure', value: 14.7 },
        ],
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(function(doc) {
          doc.referenceForm.toString().should.equal(formId.toString());
          doc.records.should.have.lengthOf(2);
          doc.records[0].name.should.equal('temperature');
          done();
        })
        .catch(done);
    });

    it('should store mixed value types in logData records', function(done) {
      new Log({
        records: [
          { name: 'count', value: 42 },
          { name: 'label', value: 'pass' },
          { name: 'active', value: true },
        ],
        inputBy: 'tester',
        inputOn: new Date(),
      })
        .save()
        .then(function(doc) {
          doc.records[0].value.should.equal(42);
          doc.records[1].value.should.equal('pass');
          doc.records[2].value.should.equal(true);
          done();
        })
        .catch(done);
    });

    it('should find a Log by _id', function(done) {
      new Log({ inputBy: 'tester', inputOn: new Date() })
        .save()
        .then(function(saved) {
          return Log.findById(saved._id);
        })
        .then(function(doc) {
          doc.should.exist;
          done();
        })
        .catch(done);
    });
  });
});
