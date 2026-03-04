/*eslint max-nested-callbacks: [2, 4], complexity: [2, 20]*/

var auth = require('../lib/auth');
var authConfig = require('../config/config').auth;
var mongoose = require('mongoose');
var _ = require('lodash');
var reqUtils = require('../lib/req-utils');
var shareLib = require('../lib/share');
var routesUtilities = require('../utilities/routes');
var jade = require('jade');
var valueProgressHtml = jade.compileFile(
  __dirname + '/../views/binder-value-progress.jade'
);
var travelerProgressHtml = jade.compileFile(
  __dirname + '/../views/binder-traveler-progress.jade'
);
var inputProgressHtml = jade.compileFile(
  __dirname + '/../views/binder-input-progress.jade'
);

var User = mongoose.model('User');
var Group = mongoose.model('Group');
var Binder = mongoose.model('Binder');
var Traveler = mongoose.model('Traveler');

module.exports = function(app) {
  app.get('/binders/', auth.ensureAuthenticated, function(req, res) {
    res.render('binders', routesUtilities.getRenderObject(req));
  });

  app.get('/binders/json', auth.ensureAuthenticated, function(req, res) {
    Binder.find({
      createdBy: req.session.userid,
      archived: {
        $ne: true,
      },
      owner: {
        $exists: false,
      },
    })
      .then(function(docs) {
        return res.status(200).json(docs);
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).send(err.message);
      });
  });

  app.get(
    '/binders/:id/config',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.canWriteMw('id'),
    function(req, res) {
      return res.render(
        'binder-config',
        routesUtilities.getRenderObject(req, {
          binder: req[req.params.id],
        })
      );
    }
  );

  app.post(
    '/binders/:id/tags/',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.canWriteMw('id'),
    reqUtils.filter('body', ['newtag']),
    reqUtils.sanitize('body', ['newtag']),
    function(req, res) {
      var doc = req[req.params.id];
      doc.updatedBy = req.session.userid;
      doc.updatedOn = Date.now();
      doc.tags.addToSet(req.body.newtag);
      doc
        .save()
        .then(function() {
          return res.status(204).send();
        })
        .catch(function(saveErr) {
          console.error(saveErr);
          return res.status(500).send(saveErr.message);
        });
    }
  );

  app.delete(
    '/binders/:id/tags/:tag',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.canWriteMw('id'),
    function(req, res) {
      var doc = req[req.params.id];
      doc.updatedBy = req.session.userid;
      doc.updatedOn = Date.now();
      doc.tags.pull(req.params.tag);
      doc
        .save()
        .then(function() {
          return res.status(204).send();
        })
        .catch(function(saveErr) {
          console.error(saveErr);
          return res.status(500).send(saveErr.message);
        });
    }
  );

  app.put(
    '/binders/:id/config',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.isOwnerMw('id'),
    reqUtils.status('id', [0, 1]),
    reqUtils.filter('body', ['title', 'description']),
    reqUtils.sanitize('body', ['title', 'description']),
    function(req, res) {
      var k;
      var doc = req[req.params.id];
      for (k in req.body) {
        if (req.body.hasOwnProperty(k) && req.body[k] !== null) {
          doc[k] = req.body[k];
        }
      }
      doc.updatedBy = req.session.userid;
      doc.updatedOn = Date.now();
      doc
        .save()
        .then(function() {
          return res.status(204).send();
        })
        .catch(function(saveErr) {
          console.error(saveErr);
          return res.status(500).send(saveErr.message);
        });
    }
  );

  app.get(
    '/binders/:id/share/',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.isOwnerMw('id'),
    function(req, res) {
      var binder = req[req.params.id];
      return res.render(
        'share',
        routesUtilities.getRenderObject(req, {
          type: 'Binder',
          id: req.params.id,
          title: binder.title,
          access: String(binder.publicAccess),
        })
      );
    }
  );

  app.put(
    '/binders/:id/share/public',
    auth.ensureAuthenticated,
    reqUtils.filter('body', ['access']),
    reqUtils.exist('id', Binder),
    reqUtils.isOwnerMw('id'),
    function(req, res) {
      var binder = req[req.params.id];
      var access = req.body.access;
      if (['-1', '0', '1'].indexOf(access) === -1) {
        return res.status(400).send('not valid value');
      }
      access = Number(access);
      if (binder.publicAccess === access) {
        return res.status(204).send();
      }
      binder.publicAccess = access;
      binder
        .save()
        .then(function() {
          return res
            .status(200)
            .send('public access is set to ' + req.body.access);
        })
        .catch(function(saveErr) {
          console.error(saveErr);
          return res.status(500).send(saveErr.message);
        });
    }
  );

  app.get(
    '/binders/:id/share/:list/json',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.canReadMw('id'),
    function(req, res) {
      var binder = req[req.params.id];
      if (req.params.list === 'users') {
        return res.status(200).json(binder.sharedWith || []);
      }
      if (req.params.list === 'groups') {
        return res.status(200).json(binder.sharedGroup || []);
      }
      return res.status(400).send('unknown share list.');
    }
  );

  app.post(
    '/binders/:id/share/:list/',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.isOwnerMw('id'),
    function(req, res) {
      var binder = req[req.params.id];
      var share = -2;
      if (req.params.list === 'users') {
        if (req.body.name) {
          share = reqUtils.getSharedWith(binder.sharedWith, req.body.name);
        } else {
          return res.status(400).send('user name is empty.');
        }
      }
      if (req.params.list === 'groups') {
        if (req.body.id) {
          share = reqUtils.getSharedGroup(binder.sharedGroup, req.body.id);
        } else {
          return res.status(400).send('group id is empty.');
        }
      }

      if (share === -2) {
        return res.status(400).send('unknown share list.');
      }

      if (share >= 0) {
        return res
          .status(400)
          .send(
            req.body.name ||
              req.body.id + ' is already in the ' + req.params.list + ' list.'
          );
      }

      if (share === -1) {
        // new user in the list
        shareLib.addShare(req, res, binder);
      }
    }
  );

  app.put(
    '/binders/:id/share/:list/:shareid',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.isOwnerMw('id'),
    function(req, res) {
      var binder = req[req.params.id];
      var share;
      if (req.params.list === 'users') {
        share = binder.sharedWith.id(req.params.shareid);
      }
      if (req.params.list === 'groups') {
        share = binder.sharedGroup.id(req.params.shareid);
      }

      if (!share) {
        // the user should in the list
        return res
          .status(404)
          .send('cannot find ' + req.params.shareid + ' in the list.');
      }

      // change the access
      if (req.body.access && req.body.access === 'write') {
        share.access = 1;
      } else {
        share.access = 0;
      }
      binder
        .save()
        .then(function() {
          // check consistency of user's traveler list
          var Target;
          if (req.params.list === 'users') {
            Target = User;
          }
          if (req.params.list === 'groups') {
            Target = Group;
          }
          Target.findByIdAndUpdate(req.params.shareid, {
            $addToSet: { binders: binder._id },
          })
            .then(function(target) {
              if (!target) {
                console.error(
                  'The user/group ' + req.params.userid + ' is not in the db'
                );
              }
            })
            .catch(function(updateErr) {
              console.error(updateErr);
            });
          return res.status(200).json(share);
        })
        .catch(function(saveErr) {
          console.error(saveErr);
          return res.status(500).send(saveErr.message);
        });
    }
  );

  app.delete(
    '/binders/:id/share/:list/:shareid',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.isOwnerMw('id'),
    function(req, res) {
      var binder = req[req.params.id];
      shareLib.removeShare(req, res, binder);
    }
  );

  app.get('/binders/new', auth.ensureAuthenticated, function(req, res) {
    res.render('binder-new', routesUtilities.getRenderObject(req));
  });

  app.post(
    '/binders/',
    auth.ensureAuthenticated,
    reqUtils.filter('body', ['title', 'description']),
    reqUtils.hasAll('body', ['title']),
    reqUtils.sanitize('body', ['title', 'description']),
    function(req, res) {
      var binder = {};
      if (req.body.works && _.isArray(req.body.works)) {
        binder.works = req.body.works;
      } else {
        binder.works = [];
      }

      binder.title = req.body.title;
      if (req.body.description) {
        binder.description = req.body.description;
      }
      binder.createdBy = req.session.userid;
      binder.createdOn = Date.now();
      new Binder(binder)
        .save()
        .then(function(newPackage) {
          var url =
            (req.proxied ? authConfig.proxied_service : authConfig.service) +
            '/binders/' +
            newPackage.id +
            '/';

          res.set('Location', url);
          return res
            .status(201)
            .send(
              'You can access the new binder at <a href="' +
                url +
                '">' +
                url +
                '</a>'
            );
        })
        .catch(function(err) {
          console.error(err);
          return res.status(500).send(err.message);
        });
    }
  );

  app.get('/transferredbinders/json', auth.ensureAuthenticated, function(
    req,
    res
  ) {
    Binder.find({
      owner: req.session.userid,
      archived: { $ne: true },
    })
      .then(function(binders) {
        res.status(200).json(binders);
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).send(err.message);
      });
  });

  app.get('/ownedbinders/json', auth.ensureAuthenticated, function(req, res) {
    var search = {
      archived: {
        $ne: true,
      },
      $or: [
        {
          createdBy: req.session.userid,
          owner: {
            $exists: false,
          },
        },
        {
          owner: req.session.userid,
        },
      ],
    };

    Binder.find(search)
      .lean()
      .then(function(binders) {
        return res.status(200).json(binders);
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).send(err.message);
      });
  });

  app.get('/sharedbinders/json', auth.ensureAuthenticated, function(req, res) {
    User.findOne({ _id: req.session.userid }, 'binders')
      .then(function(me) {
        if (!me) {
          return res.status(400).send('cannot identify the current user');
        }
        return Binder.find({
          _id: { $in: me.binders },
          archived: { $ne: true },
        }).then(function(binders) {
          return res.status(200).json(binders);
        });
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).send(err.message);
      });
  });

  app.get('/groupsharedbinders/json', auth.ensureAuthenticated, function(
    req,
    res
  ) {
    Group.find({ _id: { $in: req.session.memberOf } }, 'binders')
      .then(function(groups) {
        var binderIds = [];
        var i;
        var j;
        // merge the binders arrays
        for (i = 0; i < groups.length; i += 1) {
          for (j = 0; j < groups[i].binders.length; j += 1) {
            if (binderIds.indexOf(groups[i].binders[j]) === -1) {
              binderIds.push(groups[i].binders[j]);
            }
          }
        }
        return Binder.find({ _id: { $in: binderIds } }).then(function(binders) {
          res.status(200).json(binders);
        });
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).send(err.message);
      });
  });

  app.get('/archivedbinders/json', auth.ensureAuthenticated, function(
    req,
    res
  ) {
    Binder.find({
      createdBy: req.session.userid,
      archived: true,
    })
      .then(function(binders) {
        return res.status(200).json(binders);
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).send(err.message);
      });
  });

  app.put(
    '/binders/:id/archived',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.isOwnerMw('id'),
    reqUtils.filter('body', ['archived']),
    function(req, res) {
      var doc = req[req.params.id];
      if (doc.archived === req.body.archived) {
        return res.status(204).send();
      }

      doc.archived = req.body.archived;

      if (doc.archived) {
        doc.archivedOn = Date.now();
      }

      doc
        .save()
        .then(function(newDoc) {
          return res
            .status(200)
            .send(
              'Binder ' +
                req.params.id +
                ' archived state set to ' +
                newDoc.archived
            );
        })
        .catch(function(saveErr) {
          console.error(saveErr);
          return res.status(500).send(saveErr.message);
        });
    }
  );

  app.put(
    '/binders/:id/owner',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.isOwnerMw('id'),
    reqUtils.status('id', [0, 1]),
    reqUtils.filter('body', ['name']),
    function(req, res) {
      var doc = req[req.params.id];
      shareLib.changeOwner(req, res, doc);
    }
  );

  app.get(
    '/binders/:id/',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.canReadMw('id'),
    function(req, res) {
      res.render(
        'binder',
        routesUtilities.getRenderObject(req, {
          binder: req[req.params.id],
        })
      );
    }
  );

  app.get(
    '/binders/:id/json',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.canReadMw('id'),
    reqUtils.exist('id', Binder),
    function(req, res) {
      res.status(200).json(req[req.params.id]);
    }
  );

  app.put(
    '/binders/:id/status',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.isOwnerMw('id'),
    reqUtils.filter('body', ['status']),
    reqUtils.hasAll('body', ['status']),
    function(req, res) {
      var p = req[req.params.id];
      var s = req.body.status;

      if ([1, 2].indexOf(s) === -1) {
        return res.status(400).send('invalid status');
      }

      if (p.status === s) {
        return res.status(204).send();
      }

      if (s === 1) {
        if ([0, 2].indexOf(p.status) === -1) {
          return res.status(400).send('invalid status change');
        } else {
          p.status = s;
        }
      }

      if (s === 2) {
        if ([1].indexOf(p.status) === -1) {
          return res.status(400).send('invalid status change');
        } else {
          p.status = s;
        }
      }

      p.save()
        .then(function() {
          return res.status(200).send('status updated to ' + s);
        })
        .catch(function(err) {
          console.error(err);
          return res.status(500).send(err.message);
        });
    }
  );

  function sendMerged(t, p, res, merged, binder) {
    if (t && p) {
      if (binder.isModified()) {
        binder.updateProgress();
      }
      res.status(200).json({
        works: merged,
        inputProgress: inputProgressHtml({ binder: binder }),
        travelerProgress: travelerProgressHtml({ binder: binder }),
        valueProgress: valueProgressHtml({ binder: binder }),
      });
    }
  }

  app.get(
    '/binders/:id/works/json',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.canReadMw('id'),
    function(req, res) {
      var binder = req[req.params.id];
      var works = binder.works;

      var tids = [];
      var pids = [];

      works.forEach(function(w) {
        if (w.refType === 'traveler') {
          tids.push(w._id);
        } else {
          pids.push(w._id);
        }
      });

      if (tids.length + pids.length === 0) {
        return res.status(200).json([]);
      }

      var merged = [];

      var tFinished = false;
      var pFinished = false;

      if (tids.length === 0) {
        tFinished = true;
      }

      if (pids.length === 0) {
        pFinished = true;
      }

      if (tids.length !== 0) {
        Traveler.find(
          {
            _id: {
              $in: tids,
            },
          },
          'mapping devices tags locations manPower status createdBy owner sharedWith finishedInput totalInput'
        )
          .lean()
          .then(function(travelers) {
            travelers.forEach(function(t) {
              binder.updateWorkProgress(t);

              // works has its own toJSON, therefore need to merge only the plain
              // object
              _.extend(t, works.id(t._id).toJSON());
              merged.push(t);
            });
            tFinished = true;
            // check if ready to respond
            sendMerged(tFinished, pFinished, res, merged, binder);
          });
      }

      if (pids.length !== 0) {
        Binder.find(
          {
            _id: {
              $in: pids,
            },
          },
          'tags status createdBy owner finishedValue inProgressValue totalValue finishedInput totalInput'
        )
          .lean()
          .then(function(binders) {
            binders.forEach(function(p) {
              binder.updateWorkProgress(p);
              _.extend(p, works.id(p._id).toJSON());
              merged.push(p);
            });
            pFinished = true;
            sendMerged(tFinished, pFinished, res, merged, binder);
          })
          .catch(function(err) {
            console.error(err);
            return res.status(500).send(err.message);
          });
      }
    }
  );

  app.post(
    '/binders/:id/',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.canWriteMw('id'),
    reqUtils.status('id', [0, 1]),
    reqUtils.filter('body', ['travelerIds', 'binders']),
    function(req, res) {
      routesUtilities.binder.addWork(
        req[req.params.id],
        req.session.userid,
        req,
        res
      );
    }
  );

  app.delete(
    '/binders/:id/works/:wid',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.canWriteMw('id'),
    reqUtils.status('id', [0, 1]),
    function(req, res) {
      var p = req[req.params.id];
      var work = p.works.id(req.params.wid);

      if (!work) {
        return res
          .status(404)
          .send('Work ' + req.params.wid + ' not found in the binder.');
      }

      work.deleteOne();
      p.updatedBy = req.session.userid;
      p.updatedOn = Date.now();

      p.updateProgress(function(err, newPackage) {
        if (err) {
          console.log(err);
          return res.status(500).send(err.message);
        }
        return res.json(newPackage);
      });
    }
  );

  app.put(
    '/binders/:id/works/',
    auth.ensureAuthenticated,
    reqUtils.exist('id', Binder),
    reqUtils.canWriteMw('id'),
    reqUtils.status('id', [0, 1]),
    function(req, res) {
      var binder = req[req.params.id];
      var works = binder.works;
      var updates = req.body;
      var wid;
      var work;
      var prop;
      var u;
      var valueChanged = false;
      for (wid in updates) {
        if (!updates.hasOwnProperty(wid)) {
          continue;
        }
        work = works.id(wid);
        if (!work) {
          continue;
        }

        u = updates[wid];
        for (prop in u) {
          if (!u.hasOwnProperty(prop)) {
            continue;
          }
          if (work[prop] !== u[prop]) {
            if (prop === 'value') {
              valueChanged = true;
            }
            work[prop] = u[prop];
          }
        }
      }

      if (!binder.isModified()) {
        return res.status(204).send();
      }

      if (valueChanged) {
        binder.updateProgress(function(err, newWP) {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .send('cannot save the updates to binder ' + binder._id);
          }
          res.status(200).json(newWP.works);
        });
      } else {
        binder
          .save()
          .then(function(newWP) {
            res.status(200).json(newWP.works);
          })
          .catch(function(err) {
            console.error(err);
            return res
              .status(500)
              .send('cannot save the updates to binder ' + binder._id);
          });
      }
    }
  );

  app.get('/publicbinders/', auth.ensureAuthenticated, function(req, res) {
    res.render('public-binders', routesUtilities.getRenderObject(req));
  });

  app.get('/publicbinders/json', auth.ensureAuthenticated, function(req, res) {
    Binder.find({
      publicAccess: {
        $in: [0, 1],
      },
      archived: {
        $ne: true,
      },
    })
      .then(function(binders) {
        res.status(200).json(binders);
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).send(err.message);
      });
  });
};
