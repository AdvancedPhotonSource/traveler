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
      new User({ _id: 'jdoe' })
        .save()
        .then(function(doc) {
          doc._id.should.equal('jdoe');
          done();
        })
        .catch(done);
    });

    it('should default subscribe to false', function(done) {
      new User({ _id: 'subtest' })
        .save()
        .then(function(doc) {
          doc.subscribe.should.equal(false);
          done();
        })
        .catch(done);
    });

    it('should persist name, email, office, phone, mobile', function(done) {
      new User({
        _id: 'contact1',
        name: 'Jane Smith',
        email: 'jane@example.com',
        office: 'Bldg 401',
        phone: '630-555-0001',
        mobile: '630-555-0002',
      })
        .save()
        .then(function(doc) {
          doc.name.should.equal('Jane Smith');
          doc.email.should.equal('jane@example.com');
          doc.office.should.equal('Bldg 401');
          doc.phone.should.equal('630-555-0001');
          doc.mobile.should.equal('630-555-0002');
          done();
        })
        .catch(done);
    });

    it('should persist roles array', function(done) {
      new User({ _id: 'admin1', roles: ['admin', 'write'] })
        .save()
        .then(function(doc) {
          doc.roles.should.deep.equal(['admin', 'write']);
          done();
        })
        .catch(done);
    });

    it('should persist forms, travelers, binders ObjectId arrays', function(done) {
      var oid = new mongoose.Types.ObjectId();
      new User({
        _id: 'arruser',
        forms: [oid],
        travelers: [oid],
        binders: [oid],
      })
        .save()
        .then(function(doc) {
          doc.forms.should.have.lengthOf(1);
          doc.travelers.should.have.lengthOf(1);
          doc.binders.should.have.lengthOf(1);
          doc.forms[0].toString().should.equal(oid.toString());
          done();
        })
        .catch(done);
    });

    it('should persist apiKey and apiKeyExpiration', function(done) {
      var expDate = new Date('2030-12-31');
      new User({
        _id: 'apiuser',
        apiKey: 'abc123key',
        apiKeyExpiration: expDate,
      })
        .save()
        .then(function(doc) {
          doc.apiKey.should.equal('abc123key');
          doc.apiKeyExpiration.getTime().should.equal(expDate.getTime());
          done();
        })
        .catch(done);
    });
  });

  describe('#read', function() {
    it('should find a user by string _id', function(done) {
      new User({ _id: 'findme' })
        .save()
        .then(function() {
          return User.findById('findme');
        })
        .then(function(doc) {
          doc.should.exist;
          doc._id.should.equal('findme');
          done();
        })
        .catch(done);
    });

    it('should find a user by email', function(done) {
      new User({ _id: 'byemail', email: 'byemail@example.com' })
        .save()
        .then(function() {
          return User.findOne({ email: 'byemail@example.com' });
        })
        .then(function(doc) {
          doc.should.exist;
          doc._id.should.equal('byemail');
          done();
        })
        .catch(done);
    });

    it('should return null for a non-existent user', function(done) {
      User.findById('nonexistent')
        .then(function(doc) {
          (doc === null).should.be.true;
          done();
        })
        .catch(done);
    });

    it('should find users by role using $in', function(done) {
      var saves = [
        new User({ _id: 'u1', roles: ['admin'] }).save(),
        new User({ _id: 'u2', roles: ['write'] }).save(),
        new User({ _id: 'u3', roles: ['read'] }).save(),
      ];
      Promise.all(saves)
        .then(function() {
          return User.find({ roles: { $in: ['admin', 'write'] } });
        })
        .then(function(docs) {
          docs.should.have.lengthOf(2);
          done();
        })
        .catch(done);
    });
  });

  describe('#update', function() {
    it('should update the name field', function(done) {
      new User({ _id: 'updname' })
        .save()
        .then(function() {
          return User.findByIdAndUpdate(
            'updname',
            { $set: { name: 'Updated Name' } },
            { new: true }
          );
        })
        .then(function(doc) {
          doc.name.should.equal('Updated Name');
          done();
        })
        .catch(done);
    });

    it('should push a form ObjectId into the forms array', function(done) {
      var oid = new mongoose.Types.ObjectId();
      new User({ _id: 'pushform' })
        .save()
        .then(function() {
          return User.findByIdAndUpdate(
            'pushform',
            { $push: { forms: oid } },
            { new: true }
          );
        })
        .then(function(doc) {
          doc.forms.should.have.lengthOf(1);
          doc.forms[0].toString().should.equal(oid.toString());
          done();
        })
        .catch(done);
    });

    it('should update subscribe to true', function(done) {
      new User({ _id: 'subupd' })
        .save()
        .then(function() {
          return User.findByIdAndUpdate(
            'subupd',
            { $set: { subscribe: true } },
            { new: true }
          );
        })
        .then(function(doc) {
          doc.subscribe.should.equal(true);
          done();
        })
        .catch(done);
    });

    it('should update lastVisitedOn date', function(done) {
      var visitDate = new Date('2024-06-15');
      new User({ _id: 'visitupd' })
        .save()
        .then(function() {
          return User.findByIdAndUpdate(
            'visitupd',
            { $set: { lastVisitedOn: visitDate } },
            { new: true }
          );
        })
        .then(function(doc) {
          doc.lastVisitedOn.getTime().should.equal(visitDate.getTime());
          done();
        })
        .catch(done);
    });
  });

  describe('#delete', function() {
    it('should delete a user by _id', function(done) {
      new User({ _id: 'todelete' })
        .save()
        .then(function() {
          return User.deleteOne({ _id: 'todelete' });
        })
        .then(function(result) {
          result.deletedCount.should.equal(1);
          done();
        })
        .catch(done);
    });

    it('should return n=0 for non-existent user', function(done) {
      User.deleteOne({ _id: 'nosuchuser' })
        .then(function(result) {
          result.deletedCount.should.equal(0);
          done();
        })
        .catch(done);
    });
  });

  describe('Group model', function() {
    describe('#create', function() {
      it('should create a group with a string _id', function(done) {
        new Group({ _id: 'controls-grp' })
          .save()
          .then(function(doc) {
            doc._id.should.equal('controls-grp');
            done();
          })
          .catch(done);
      });

      it('should default deleted to false', function(done) {
        new Group({ _id: 'grp-default' })
          .save()
          .then(function(doc) {
            doc.deleted.should.equal(false);
            done();
          })
          .catch(done);
      });

      it('should persist a members array of user id strings', function(done) {
        new Group({ _id: 'grp-members', members: ['alice', 'bob'] })
          .save()
          .then(function(doc) {
            doc.members.should.deep.equal(['alice', 'bob']);
            done();
          })
          .catch(done);
      });
    });

    describe('#read', function() {
      it('should find a group by _id', function(done) {
        new Group({ _id: 'grp-read' })
          .save()
          .then(function() {
            return Group.findById('grp-read');
          })
          .then(function(doc) {
            doc.should.exist;
            doc._id.should.equal('grp-read');
            done();
          })
          .catch(done);
      });

      it('should find groups where deleted is false', function(done) {
        var saves = [
          new Group({ _id: 'grp-active', deleted: false }).save(),
          new Group({ _id: 'grp-deleted', deleted: true }).save(),
        ];
        Promise.all(saves)
          .then(function() {
            return Group.find({ deleted: false });
          })
          .then(function(docs) {
            docs.should.have.lengthOf(1);
            docs[0]._id.should.equal('grp-active');
            done();
          })
          .catch(done);
      });
    });

    describe('#update', function() {
      it('should soft-delete a group by setting deleted=true', function(done) {
        new Group({ _id: 'grp-softdel' })
          .save()
          .then(function() {
            return Group.findByIdAndUpdate(
              'grp-softdel',
              { $set: { deleted: true } },
              { new: true }
            );
          })
          .then(function(doc) {
            doc.deleted.should.equal(true);
            done();
          })
          .catch(done);
      });

      it('should add a member username to the members array', function(done) {
        new Group({ _id: 'grp-addmember', members: ['alice'] })
          .save()
          .then(function() {
            return Group.findByIdAndUpdate(
              'grp-addmember',
              { $push: { members: 'bob' } },
              { new: true }
            );
          })
          .then(function(doc) {
            doc.members.should.include('alice');
            doc.members.should.include('bob');
            done();
          })
          .catch(done);
      });
    });

    describe('#delete', function() {
      it('should hard-delete a group document', function(done) {
        new Group({ _id: 'grp-harddel' })
          .save()
          .then(function() {
            return Group.deleteOne({ _id: 'grp-harddel' });
          })
          .then(function(result) {
            result.deletedCount.should.equal(1);
            done();
          })
          .catch(done);
      });
    });
  });
});
