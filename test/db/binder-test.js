/*global describe, it, before, after, beforeEach*/
'use strict';

require('chai').should();
var mongoose = require('mongoose');
var setup = require('./setup');

var Binder = mongoose.model('Binder');

var COLLECTIONS = ['Binder', 'Traveler'];

describe('Binder model - database acceptance', function() {
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
    it('should default status to 0', function(done) {
      new Binder({ title: 'B1', createdBy: 'tester' }).save(function(err, doc) {
        if (err) return done(err);
        doc.status.should.equal(0);
        done();
      });
    });

    it('should default archived to false', function(done) {
      new Binder({ title: 'B2', createdBy: 'tester' }).save(function(err, doc) {
        if (err) return done(err);
        doc.archived.should.equal(false);
        done();
      });
    });

    it('should create a binder with an empty works array', function(done) {
      new Binder({ title: 'B3', createdBy: 'tester' }).save(function(err, doc) {
        if (err) return done(err);
        doc.works.should.have.lengthOf(0);
        done();
      });
    });

    it('should default all progress fields to 0', function(done) {
      new Binder({ title: 'B4', createdBy: 'tester' }).save(function(err, doc) {
        if (err) return done(err);
        doc.finishedInput.should.equal(0);
        doc.totalInput.should.equal(0);
        doc.finishedValue.should.equal(0);
        doc.inProgressValue.should.equal(0);
        doc.totalValue.should.equal(0);
        doc.finishedWork.should.equal(0);
        doc.inProgressWork.should.equal(0);
        doc.totalWork.should.equal(0);
        done();
      });
    });
  });

  describe('#read', function() {
    it('should find a binder by _id', function(done) {
      new Binder({ title: 'FindMe' }).save(function(err, saved) {
        if (err) return done(err);
        Binder.findById(saved._id, function(err, doc) {
          if (err) return done(err);
          doc.should.exist;
          doc.title.should.equal('FindMe');
          done();
        });
      });
    });

    it('should find non-archived binders', function(done) {
      var saves = [
        new Binder({ title: 'Active', archived: false }).save(),
        new Binder({ title: 'Archived', archived: true }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          Binder.find({ archived: false }, function(err, docs) {
            if (err) return done(err);
            docs.should.have.lengthOf(1);
            docs[0].title.should.equal('Active');
            done();
          });
        })
        .catch(done);
    });

    it('should find a binder by owner', function(done) {
      var saves = [
        new Binder({ title: 'Alice Binder', owner: 'alice' }).save(),
        new Binder({ title: 'Bob Binder', owner: 'bob' }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          Binder.find({ owner: 'alice' }, function(err, docs) {
            if (err) return done(err);
            docs.should.have.lengthOf(1);
            docs[0].title.should.equal('Alice Binder');
            done();
          });
        })
        .catch(done);
    });
  });

  describe('#update - status transitions', function() {
    it('should transition status from 0 to 1', function(done) {
      new Binder({ title: 'Trans1' }).save(function(err, doc) {
        if (err) return done(err);
        Binder.findByIdAndUpdate(
          doc._id,
          { $set: { status: 1 } },
          { new: true },
          function(err, updated) {
            if (err) return done(err);
            updated.status.should.equal(1);
            done();
          }
        );
      });
    });

    it('should transition status from 1 to 2 (completed)', function(done) {
      new Binder({ title: 'Trans2', status: 1 }).save(function(err, doc) {
        if (err) return done(err);
        Binder.findByIdAndUpdate(
          doc._id,
          { $set: { status: 2 } },
          { new: true },
          function(err, updated) {
            if (err) return done(err);
            updated.status.should.equal(2);
            done();
          }
        );
      });
    });

    it('should transition status to 3 (archived)', function(done) {
      new Binder({ title: 'Trans3', status: 2 }).save(function(err, doc) {
        if (err) return done(err);
        Binder.findByIdAndUpdate(
          doc._id,
          { $set: { status: 3 } },
          { new: true },
          function(err, updated) {
            if (err) return done(err);
            updated.status.should.equal(3);
            done();
          }
        );
      });
    });
  });

  describe('work items', function() {
    it('should add a work item with refType=traveler', function(done) {
      var workId = new mongoose.Types.ObjectId();
      new Binder({
        title: 'WorkBinder',
        works: [{ _id: workId, refType: 'traveler', alias: 'Run 1' }],
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.works.should.have.lengthOf(1);
        doc.works[0].refType.should.equal('traveler');
        doc.works[0].alias.should.equal('Run 1');
        done();
      });
    });

    it('should add a work item with refType=binder', function(done) {
      new Binder({
        title: 'BinderOfBinders',
        works: [{ refType: 'binder' }],
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.works[0].refType.should.equal('binder');
        done();
      });
    });

    it('should reject a work item with invalid refType', function(done) {
      new Binder({
        title: 'BadRefType',
        works: [{ refType: 'invalid' }],
      }).save(function(err) {
        err.should.exist;
        done();
      });
    });

    it('should apply default values to work items', function(done) {
      new Binder({
        title: 'WorkDefaults',
        works: [{ refType: 'traveler' }],
      }).save(function(err, doc) {
        if (err) return done(err);
        var w = doc.works[0];
        w.finished.should.equal(0);
        w.inProgress.should.equal(0);
        w.priority.should.equal(5);
        w.value.should.equal(10);
        w.color.should.equal('blue');
        w.sequence.should.equal(1);
        done();
      });
    });

    it('should persist custom priority within min/max range', function(done) {
      new Binder({
        title: 'Priority',
        works: [{ refType: 'traveler', priority: 3 }],
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.works[0].priority.should.equal(3);
        done();
      });
    });

    it('should reject work priority below min=1', function(done) {
      new Binder({
        title: 'BadPriority',
        works: [{ refType: 'traveler', priority: 0 }],
      }).save(function(err) {
        err.should.exist;
        done();
      });
    });

    it('should reject work priority above max=10', function(done) {
      new Binder({
        title: 'HighPriority',
        works: [{ refType: 'traveler', priority: 11 }],
      }).save(function(err) {
        err.should.exist;
        done();
      });
    });

    it('should accept all valid color enum values', function(done) {
      var validColors = ['green', 'yellow', 'red', 'blue', 'black'];
      var saves = validColors.map(function(color) {
        return new Binder({
          title: 'Color-' + color,
          works: [{ refType: 'traveler', color: color }],
        }).save();
      });
      Promise.all(saves)
        .then(function(docs) {
          docs.forEach(function(doc, i) {
            doc.works[0].color.should.equal(validColors[i]);
          });
          done();
        })
        .catch(done);
    });

    it('should reject an invalid work color enum value', function(done) {
      new Binder({
        title: 'BadColor',
        works: [{ refType: 'traveler', color: 'purple' }],
      }).save(function(err) {
        err.should.exist;
        done();
      });
    });

    it('should reject work sequence below min=1', function(done) {
      new Binder({
        title: 'BadSeq',
        works: [{ refType: 'traveler', sequence: 0 }],
      }).save(function(err) {
        err.should.exist;
        done();
      });
    });
  });

  describe('updateProgress() method', function() {
    it('should calculate totalWork as the count of works', function(done) {
      var b = new Binder({
        title: 'ProgressTest',
        works: [
          {
            refType: 'traveler',
            value: 10,
            finished: 0,
            inProgress: 0,
            totalInput: 5,
            finishedInput: 3,
          },
          {
            refType: 'traveler',
            value: 20,
            finished: 1,
            inProgress: 0,
            totalInput: 4,
            finishedInput: 4,
          },
        ],
      });
      b.save(function(err, saved) {
        if (err) return done(err);
        saved.updateProgress(function(err, updated) {
          if (err) return done(err);
          updated.totalWork.should.equal(2);
          done();
        });
      });
    });

    it('should calculate totalValue as the sum of work values', function(done) {
      var b = new Binder({
        title: 'TotalVal',
        works: [
          {
            refType: 'traveler',
            value: 10,
            finished: 0,
            inProgress: 0,
            totalInput: 0,
            finishedInput: 0,
          },
          {
            refType: 'traveler',
            value: 20,
            finished: 0,
            inProgress: 0,
            totalInput: 0,
            finishedInput: 0,
          },
        ],
      });
      b.save(function(err, saved) {
        if (err) return done(err);
        saved.updateProgress(function(err, updated) {
          if (err) return done(err);
          updated.totalValue.should.equal(30);
          done();
        });
      });
    });

    it('should calculate finishedValue as sum(value * finished)', function(done) {
      var b = new Binder({
        title: 'FinishedVal',
        works: [
          {
            refType: 'traveler',
            value: 10,
            finished: 0,
            inProgress: 0,
            totalInput: 0,
            finishedInput: 0,
          },
          {
            refType: 'traveler',
            value: 20,
            finished: 1,
            inProgress: 0,
            totalInput: 0,
            finishedInput: 0,
          },
        ],
      });
      b.save(function(err, saved) {
        if (err) return done(err);
        saved.updateProgress(function(err, updated) {
          if (err) return done(err);
          updated.finishedValue.should.equal(20); // 10*0 + 20*1
          done();
        });
      });
    });

    it('should calculate totalInput and finishedInput as sums of works', function(done) {
      var b = new Binder({
        title: 'InputSums',
        works: [
          {
            refType: 'traveler',
            value: 10,
            finished: 0,
            inProgress: 0,
            totalInput: 5,
            finishedInput: 3,
          },
          {
            refType: 'traveler',
            value: 20,
            finished: 1,
            inProgress: 0,
            totalInput: 4,
            finishedInput: 4,
          },
        ],
      });
      b.save(function(err, saved) {
        if (err) return done(err);
        saved.updateProgress(function(err, updated) {
          if (err) return done(err);
          updated.totalInput.should.equal(9);
          updated.finishedInput.should.equal(7);
          done();
        });
      });
    });

    it('should set progressUpdatedOn when progress changes', function(done) {
      var b = new Binder({
        title: 'ProgressDate',
        works: [
          {
            refType: 'traveler',
            value: 10,
            finished: 1,
            inProgress: 0,
            totalInput: 3,
            finishedInput: 3,
          },
        ],
      });
      b.save(function(err, saved) {
        if (err) return done(err);
        saved.updateProgress(function(err, updated) {
          if (err) return done(err);
          updated.progressUpdatedOn.should.exist;
          (updated.progressUpdatedOn instanceof Date).should.be.true;
          done();
        });
      });
    });
  });

  describe('updateWorkProgress() method', function() {
    it('should set finished=1 and inProgress=0 when spec.status=2 (completed)', function(done) {
      var workId = new mongoose.Types.ObjectId();
      var spec = {
        _id: workId,
        status: 2,
        totalInput: 5,
        finishedInput: 5,
      };
      var b = new Binder({
        title: 'WPCompleted',
        works: [{ _id: workId, refType: 'traveler', value: 10 }],
      });
      b.save(function(err, saved) {
        if (err) return done(err);
        saved.updateWorkProgress(spec);
        var w = saved.works.id(workId);
        w.finished.should.equal(1);
        w.inProgress.should.equal(0);
        done();
      });
    });

    it('should set finished=0 and inProgress=0 when spec.status=0 (initialized)', function(done) {
      var workId = new mongoose.Types.ObjectId();
      var spec = {
        _id: workId,
        status: 0,
        totalInput: 5,
        finishedInput: 0,
      };
      var b = new Binder({
        title: 'WPInitialized',
        works: [{ _id: workId, refType: 'traveler', value: 10, finished: 1 }],
      });
      b.save(function(err, saved) {
        if (err) return done(err);
        saved.updateWorkProgress(spec);
        var w = saved.works.id(workId);
        w.finished.should.equal(0);
        w.inProgress.should.equal(0);
        done();
      });
    });

    it('should calculate inProgress as finishedInput/totalInput for active traveler', function(done) {
      var workId = new mongoose.Types.ObjectId();
      var spec = {
        _id: workId,
        status: 1,
        totalInput: 10,
        finishedInput: 5,
      };
      var b = new Binder({
        title: 'WPActive',
        works: [{ _id: workId, refType: 'traveler', value: 10 }],
      });
      b.save(function(err, saved) {
        if (err) return done(err);
        saved.updateWorkProgress(spec);
        var w = saved.works.id(workId);
        w.inProgress.should.equal(0.5); // 5/10
        done();
      });
    });

    it('should set inProgress=1 for active traveler with no inputs (totalInput=0)', function(done) {
      var workId = new mongoose.Types.ObjectId();
      var spec = {
        _id: workId,
        status: 1,
        totalInput: 0,
        finishedInput: 0,
      };
      var b = new Binder({
        title: 'WPNoInputs',
        works: [{ _id: workId, refType: 'traveler', value: 10 }],
      });
      b.save(function(err, saved) {
        if (err) return done(err);
        saved.updateWorkProgress(spec);
        var w = saved.works.id(workId);
        w.inProgress.should.equal(1);
        done();
      });
    });

    it('should update totalInput and finishedInput on the work item', function(done) {
      var workId = new mongoose.Types.ObjectId();
      var spec = {
        _id: workId,
        status: 2,
        totalInput: 8,
        finishedInput: 8,
      };
      var b = new Binder({
        title: 'WPInputs',
        works: [{ _id: workId, refType: 'traveler', value: 10 }],
      });
      b.save(function(err, saved) {
        if (err) return done(err);
        saved.updateWorkProgress(spec);
        var w = saved.works.id(workId);
        w.totalInput.should.equal(8);
        w.finishedInput.should.equal(8);
        done();
      });
    });

    it('should not crash when work _id is not found in works array', function(done) {
      var unknownId = new mongoose.Types.ObjectId();
      var spec = { _id: unknownId, status: 2, totalInput: 0, finishedInput: 0 };
      var b = new Binder({ title: 'NotFound' });
      b.save(function(err, saved) {
        if (err) return done(err);
        // Should return early without error
        saved.updateWorkProgress(spec);
        done();
      });
    });
  });

  describe('#delete', function() {
    it('should delete a binder by _id', function(done) {
      new Binder({ title: 'ToDelete' }).save(function(err, doc) {
        if (err) return done(err);
        Binder.deleteOne({ _id: doc._id }, function(err, result) {
          if (err) return done(err);
          result.deletedCount.should.equal(1);
          done();
        });
      });
    });
  });
});
