/*global describe, it, before, after, beforeEach*/
'use strict';

require('chai').should();
var mongoose = require('mongoose');
var setup = require('./setup');

var User = mongoose.model('User');
var Group = mongoose.model('Group');

var COLLECTIONS = ['User', 'Group'];

describe('User model - database acceptance', function() {
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
    it('should create a user with a string _id', function(done) {
      new User({ _id: 'jdoe' }).save(function(err, doc) {
        if (err) return done(err);
        doc._id.should.equal('jdoe');
        done();
      });
    });

    it('should default subscribe to false', function(done) {
      new User({ _id: 'subtest' }).save(function(err, doc) {
        if (err) return done(err);
        doc.subscribe.should.equal(false);
        done();
      });
    });

    it('should persist name, email, office, phone, mobile', function(done) {
      new User({
        _id: 'contact1',
        name: 'Jane Smith',
        email: 'jane@example.com',
        office: 'Bldg 401',
        phone: '630-555-0001',
        mobile: '630-555-0002',
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.name.should.equal('Jane Smith');
        doc.email.should.equal('jane@example.com');
        doc.office.should.equal('Bldg 401');
        doc.phone.should.equal('630-555-0001');
        doc.mobile.should.equal('630-555-0002');
        done();
      });
    });

    it('should persist roles array', function(done) {
      new User({ _id: 'admin1', roles: ['admin', 'write'] }).save(function(
        err,
        doc
      ) {
        if (err) return done(err);
        doc.roles.should.deep.equal(['admin', 'write']);
        done();
      });
    });

    it('should persist forms, travelers, binders ObjectId arrays', function(done) {
      var oid = new mongoose.Types.ObjectId();
      new User({
        _id: 'arruser',
        forms: [oid],
        travelers: [oid],
        binders: [oid],
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.forms.should.have.lengthOf(1);
        doc.travelers.should.have.lengthOf(1);
        doc.binders.should.have.lengthOf(1);
        doc.forms[0].toString().should.equal(oid.toString());
        done();
      });
    });

    it('should persist apiKey and apiKeyExpiration', function(done) {
      var expDate = new Date('2030-12-31');
      new User({
        _id: 'apiuser',
        apiKey: 'abc123key',
        apiKeyExpiration: expDate,
      }).save(function(err, doc) {
        if (err) return done(err);
        doc.apiKey.should.equal('abc123key');
        doc.apiKeyExpiration.getTime().should.equal(expDate.getTime());
        done();
      });
    });
  });

  describe('#read', function() {
    it('should find a user by string _id', function(done) {
      new User({ _id: 'findme' }).save(function(err) {
        if (err) return done(err);
        User.findById('findme', function(err, doc) {
          if (err) return done(err);
          doc.should.exist;
          doc._id.should.equal('findme');
          done();
        });
      });
    });

    it('should find a user by email', function(done) {
      new User({ _id: 'byemail', email: 'byemail@example.com' }).save(function(
        err
      ) {
        if (err) return done(err);
        User.findOne({ email: 'byemail@example.com' }, function(err, doc) {
          if (err) return done(err);
          doc.should.exist;
          doc._id.should.equal('byemail');
          done();
        });
      });
    });

    it('should return null for a non-existent user', function(done) {
      User.findById('nonexistent', function(err, doc) {
        if (err) return done(err);
        (doc === null).should.be.true;
        done();
      });
    });

    it('should find users by role using $in', function(done) {
      var saves = [
        new User({ _id: 'u1', roles: ['admin'] }).save(),
        new User({ _id: 'u2', roles: ['write'] }).save(),
        new User({ _id: 'u3', roles: ['read'] }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          User.find({ roles: { $in: ['admin', 'write'] } }, function(
            err,
            docs
          ) {
            if (err) return done(err);
            docs.should.have.lengthOf(2);
            done();
          });
        })
        .catch(done);
    });
  });

  describe('#update', function() {
    it('should update the name field', function(done) {
      new User({ _id: 'updname' }).save(function(err) {
        if (err) return done(err);
        User.findByIdAndUpdate(
          'updname',
          { $set: { name: 'Updated Name' } },
          { new: true },
          function(err, doc) {
            if (err) return done(err);
            doc.name.should.equal('Updated Name');
            done();
          }
        );
      });
    });

    it('should push a form ObjectId into the forms array', function(done) {
      var oid = new mongoose.Types.ObjectId();
      new User({ _id: 'pushform' }).save(function(err) {
        if (err) return done(err);
        User.findByIdAndUpdate(
          'pushform',
          { $push: { forms: oid } },
          { new: true },
          function(err, doc) {
            if (err) return done(err);
            doc.forms.should.have.lengthOf(1);
            doc.forms[0].toString().should.equal(oid.toString());
            done();
          }
        );
      });
    });

    it('should update subscribe to true', function(done) {
      new User({ _id: 'subupd' }).save(function(err) {
        if (err) return done(err);
        User.findByIdAndUpdate(
          'subupd',
          { $set: { subscribe: true } },
          { new: true },
          function(err, doc) {
            if (err) return done(err);
            doc.subscribe.should.equal(true);
            done();
          }
        );
      });
    });

    it('should update lastVisitedOn date', function(done) {
      var visitDate = new Date('2024-06-15');
      new User({ _id: 'visitupd' }).save(function(err) {
        if (err) return done(err);
        User.findByIdAndUpdate(
          'visitupd',
          { $set: { lastVisitedOn: visitDate } },
          { new: true },
          function(err, doc) {
            if (err) return done(err);
            doc.lastVisitedOn.getTime().should.equal(visitDate.getTime());
            done();
          }
        );
      });
    });
  });

  describe('#delete', function() {
    it('should delete a user by _id', function(done) {
      new User({ _id: 'todelete' }).save(function(err) {
        if (err) return done(err);
        User.deleteOne({ _id: 'todelete' }, function(err, result) {
          if (err) return done(err);
          result.deletedCount.should.equal(1);
          done();
        });
      });
    });

    it('should return n=0 for non-existent user', function(done) {
      User.deleteOne({ _id: 'nosuchuser' }, function(err, result) {
        if (err) return done(err);
        result.deletedCount.should.equal(0);
        done();
      });
    });
  });

  describe('Group model', function() {
    describe('#create', function() {
      it('should create a group with a string _id', function(done) {
        new Group({ _id: 'controls-grp' }).save(function(err, doc) {
          if (err) return done(err);
          doc._id.should.equal('controls-grp');
          done();
        });
      });

      it('should default deleted to false', function(done) {
        new Group({ _id: 'grp-default' }).save(function(err, doc) {
          if (err) return done(err);
          doc.deleted.should.equal(false);
          done();
        });
      });

      it('should persist a members array of user id strings', function(done) {
        new Group({ _id: 'grp-members', members: ['alice', 'bob'] }).save(
          function(err, doc) {
            if (err) return done(err);
            doc.members.should.deep.equal(['alice', 'bob']);
            done();
          }
        );
      });
    });

    describe('#read', function() {
      it('should find a group by _id', function(done) {
        new Group({ _id: 'grp-read' }).save(function(err) {
          if (err) return done(err);
          Group.findById('grp-read', function(err, doc) {
            if (err) return done(err);
            doc.should.exist;
            doc._id.should.equal('grp-read');
            done();
          });
        });
      });

      it('should find groups where deleted is false', function(done) {
        var saves = [
          new Group({ _id: 'grp-active', deleted: false }).save(),
          new Group({ _id: 'grp-deleted', deleted: true }).save(),
        ];
        Promise.all(saves)
          .then(function() {
            Group.find({ deleted: false }, function(err, docs) {
              if (err) return done(err);
              docs.should.have.lengthOf(1);
              docs[0]._id.should.equal('grp-active');
              done();
            });
          })
          .catch(done);
      });
    });

    describe('#update', function() {
      it('should soft-delete a group by setting deleted=true', function(done) {
        new Group({ _id: 'grp-softdel' }).save(function(err) {
          if (err) return done(err);
          Group.findByIdAndUpdate(
            'grp-softdel',
            { $set: { deleted: true } },
            { new: true },
            function(err, doc) {
              if (err) return done(err);
              doc.deleted.should.equal(true);
              done();
            }
          );
        });
      });

      it('should add a member username to the members array', function(done) {
        new Group({ _id: 'grp-addmember', members: ['alice'] }).save(function(
          err
        ) {
          if (err) return done(err);
          Group.findByIdAndUpdate(
            'grp-addmember',
            { $push: { members: 'bob' } },
            { new: true },
            function(err, doc) {
              if (err) return done(err);
              doc.members.should.include('alice');
              doc.members.should.include('bob');
              done();
            }
          );
        });
      });
    });

    describe('#delete', function() {
      it('should hard-delete a group document', function(done) {
        new Group({ _id: 'grp-harddel' }).save(function(err) {
          if (err) return done(err);
          Group.deleteOne({ _id: 'grp-harddel' }, function(err, result) {
            if (err) return done(err);
            result.deletedCount.should.equal(1);
            done();
          });
        });
      });
    });
  });
});
