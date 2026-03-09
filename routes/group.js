var config = require('../config/config.js');
var ad = config.ad;

var ldapClient = require('../lib/ldap-client');

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Group = mongoose.model('Group');

var auth = require('../lib/auth');
var authConfig = config.auth;
var routesUtilities = require('../utilities/routes.js');
var Roles = ['manager', 'admin', 'read_all_forms', 'write_active_travelers'];

var fs = require('fs');
var pending_photo = {};
var options = {
  root: __dirname + '/../userphoto/',
  maxAge: 30 * 24 * 3600 * 1000,
};

function cleanList(id, f) {
  var res_list = pending_photo[id];
  delete pending_photo[id];
  res_list.forEach(f);
}

function listADGroups(req, res) {
  var query = req.query.term;
  var filter;
  var opts;
  if (query && query.length > 0) {
    if (query[query.length - 1] === '*') {
      filter = ad.groupSearchFilter.replace('_id', query);
    } else {
      filter = ad.groupSearchFilter.replace('_id', query + '*');
    }
  } else {
    filter = ad.groupSearchFilter.replace('_id', '*');
  }
  opts = {
    filter: filter,
    attributes: ad.groupAttributes,
    scope: 'sub',
  };
  ldapClient.search(ad.groupSearchBase, opts, false, function(err, result) {
    if (err) {
      return res.status(500).send(err.message);
    }
    if (result.length === 0) {
      return res.json([]);
    }
    return res.json(result);
  });
}

function addGroup(req, res) {
  var group;
  if (ad.groupSearchBase && ad.groupSearchBase.length > 0) {
    var nameFilter = ad.nameFilter.replace('_name', req.body.name);
    var opts = {
      filter: nameFilter,
      attributes: ad.objAttributes,
      scope: 'sub',
    };

    ldapClient.search(ad.groupSearchBase, opts, false, function(
      ldapErr,
      result
    ) {
      if (ldapErr) {
        console.error(ldapErr.name + ' : ' + ldapErr.message);
        return res.status(500).json(ldapErr);
      }

      if (result.length === 0) {
        return res.status(404).send(req.body.name + ' is not found in AD!');
      }

      if (result.length > 1) {
        return res.status(400).send(req.body.name + ' is not unique!');
      }
      var roles = [];
      if (req.body.manager) {
        roles.push('manager');
      }
      if (req.body.admin) {
        roles.push('admin');
      }
      group = new Group({
        _id: result[0].sAMAccountName.toLowerCase(),
        name: result[0].displayName,
        email: result[0].mail,
        office: result[0].physicalDeliveryOfficeName,
        phone: result[0].telephoneNumber,
        mobile: result[0].mobile,
        roles: roles,
      });
    });
  } else {
    group = new Group({
      _id: req.body.name.toLowerCase(),
      name: req.body.name,
    });
  }

  group
    .save()
    .then(function(newGroup) {
      var url =
        (req.proxied ? authConfig.proxied_service : authConfig.service) +
        '/groups/' +
        newGroup._id;
      res.set('Location', url);
      return res
        .status(201)
        .send(
          'The new group is at <a target="_blank" href="' +
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

module.exports = function(app) {
  app.get('/groupnames/:name', auth.ensureAuthenticated, function(req, res) {
    Group.findOne({
      name: req.params.name,
    })
      .then(function(group) {
        if (group) {
          return res.render(
            'group',
            routesUtilities.getRenderObject(req, {
              group: group,
              myRoles: req.session.roles,
            })
          );
        }
        return res.status(404).send(req.params.name + ' not found');
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).send(err.message);
      });
  });

  app.post('/groups/', auth.ensureAuthenticated, function(req, res) {
    if (
      req.session.roles === undefined ||
      req.session.roles.indexOf('admin') === -1
    ) {
      return res.status(403).send('only admin allowed');
    }

    if (!req.body.name) {
      return res.status(400).send('need to know name');
    }

    // check if already in db
    Group.findOne({
      name: req.body.name,
    })
      .then(function(group) {
        if (group) {
          var url =
            (req.proxied ? authConfig.proxied_service : authConfig.service) +
            '/groups/' +
            group._id;
          return res
            .status(200)
            .send(
              'The group is at <a target="_blank" href="' +
                url +
                '">' +
                url +
                '</a>'
            );
        }
        addGroup(req, res);
      })
      .catch(function(err) {
        return res.status(500).send(err.message);
      });
  });

  app.get('/groups/json', auth.ensureAuthenticated, function(req, res) {
    if (
      req.session.roles === undefined ||
      req.session.roles.indexOf('admin') === -1
    ) {
      return res
        .status(403)
        .send('You are not authorized to access this resource. ');
    }

    if (ad.groupSearchFilter) {
      return listADGroups(req, res);
    }

    if ('_' in req.query) {
      delete req.query['_'];
    }

    Group.find(req.query)
      .populate('members')
      .then(function(groups) {
        return res.json(groups);
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      });
  });

  app.get('/groups/:id', auth.ensureAuthenticated, function(req, res) {
    Group.findOne({
      _id: req.params.id,
    })
      .then(function(group) {
        if (group) {
          return res.render(
            'group',
            routesUtilities.getRenderObject(req, {
              group: group,
              myRoles: req.session.roles,
            })
          );
        }
        return res
          .status(404)
          .send('Group ' + req.params.id + ' does not exist');
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).send(err.message);
      });
  });

  app.put('/groups/:id', auth.ensureAuthenticated, function(req, res) {
    if (
      req.session.roles === undefined ||
      req.session.roles.indexOf('admin') === -1
    ) {
      return res
        .status(403)
        .send('You are not authorized to access this resource. ');
    }
    if (!req.is('json')) {
      return res.status(415).json({
        error: 'json request expected.',
      });
    }
    Group.findOneAndUpdate(
      {
        _id: req.params.id,
      },
      req.body
    )
      .then(function() {
        return res.status(204).send();
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      });
  });

  app.put('/groups/:id/addmember/:user', auth.ensureAuthenticated, function(
    req,
    res
  ) {
    if (
      req.session.roles === undefined ||
      req.session.roles.indexOf('admin') === -1
    ) {
      return res
        .status(403)
        .send('You are not authorized to access this resource. ');
    }
    let username = req.params.user;
    if (!username || username.length == 0) {
      return res.status(403).send('You must provide a username');
    }
    let nameFilter = ad.searchFilter.replace('_id', username);
    let opts = {
      filter: nameFilter,
      attributes: ad.memberAttributes,
      paged: { pageSize: 10 },
      scope: 'sub',
    };
    ldapClient.search(ad.searchBase, opts, false, function(err, result) {
      if (err) {
        return res.status(500).send(err);
      }
      if (result.length == 0) {
        return res.status(404).send('No user with username ' + username);
      } else if (result.length > 1) {
        return res.status(403).send('User ' + username + ' is not unique');
      }
      const uid = result[0].sAMAccountName.toLowerCase();
      if (uid.length == 0) {
        return res
          .status(404)
          .send('Could not find user with name ' + req.params.user);
      }

      // If user isn't already in user table, store it with no special roles.
      User.findOne({ _id: uid })
        .then(function(user) {
          if (!user) {
            user = new User({
              _id: uid,
              name: result[0].displayName,
              email: result[0].mail,
              office: result[0].physicalDeliveryOfficeName,
              phone: result[0].telephoneNumber,
              mobile: result[0].mobile,
              roles: [],
            });
            user.save().catch(function(err) {
              console.error(err);
            });
          }
        })
        .catch(function() {
          // non-fatal — continue with group update
        });

      Group.findOne({ _id: req.params.id })
        .then(function(group) {
          if (!group) {
            return res
              .status(404)
              .json({ error: 'Cannot find group with id ' + req.params.id });
          }
          const theuid = group.members.find(function(name) {
            return name == uid;
          });
          if (theuid) {
            // silent failure when user is already in group
            return res.status(204).send();
          }
          group.members.push(uid);
          return Group.findOneAndUpdate(
            { _id: req.params.id },
            { members: group.members }
          ).then(function() {
            return res.status(204).send();
          });
        })
        .catch(function(err) {
          console.error(err);
          return res.status(500).json({ error: err.message });
        });
    });
  });

  app.put('/groups/:id/removeMembers', auth.ensureAuthenticated, function(
    req,
    res
  ) {
    if (
      req.session.roles === undefined ||
      req.session.roles.indexOf('admin') === -1
    ) {
      return res
        .status(403)
        .send('You are not authorized to access this resource. ');
    }
    let data = req.body;
    if (!data || data.length == 0) {
      return res.status(403).send('You must provide at least one userid');
    }
    Group.findOne({ _id: req.params.id })
      .then(function(group) {
        if (!group) {
          return res
            .status(404)
            .json({ error: 'Cannot find group with id ' + req.params.id });
        }
        const members = group.members.filter(function(name) {
          return (
            data.findIndex(function(member) {
              return member._id === name;
            }) === -1
          );
        });
        return Group.findOneAndUpdate(
          { _id: req.params.id },
          { members: members }
        ).then(function() {
          return res.status(204).send();
        });
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      });
  });

  app.delete('/groups/:id', auth.ensureAuthenticated, function(req, res) {
    if (
      req.session.roles === undefined ||
      req.session.roles.indexOf('admin') === -1
    ) {
      return res
        .status(403)
        .send('You are not authorized to access this resource. ');
    }
    if (!req.is('json')) {
      return res.status(415).json({
        error: 'json request expected.',
      });
    }
    Group.findOneAndUpdate({ _id: req.params.id }, { deleted: true })
      .then(function() {
        return res.status(204).send();
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      });
  });

  // get from the db not ad
  app.get('/groups/:id/json', auth.ensureAuthenticated, function(req, res) {
    Group.findOne({
      _id: req.params.id,
    })
      .then(function(group) {
        return res.json(group);
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      });
  });

  app.get('/groups/:id/members/json', auth.ensureAuthenticated, function(
    req,
    res
  ) {
    Group.findOne({
      _id: req.params.id,
    })
      .populate('members')
      .then(function(group) {
        if (group === null) {
          return res.status(404).send();
        }
        return res.json(group.members);
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      });
  });

  app.get('/groups/:id/refresh', auth.ensureAuthenticated, function(req, res) {
    if (
      req.session.roles === undefined ||
      req.session.roles.indexOf('admin') === -1
    ) {
      return res
        .status(403)
        .send('You are not authorized to access this resource. ');
    }
    Group.findOne({
      _id: req.params.id,
    })
      .then(function(group) {
        if (group) {
          updateGroupProfile(group, res);
        } else {
          return res
            .status(404)
            .send(req.params.id + ' is not in the application.');
        }
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).send(err.message);
      });
  });

  // resource /adgroups

  app.get('/adgroups/', auth.ensureAuthenticated, function(req, res) {
    return res.status(200).send('Please provide the group id');
  });

  app.get('/adgroups/:id', auth.ensureAuthenticated, function(req, res) {
    var searchFilter = ad.searchFilter.replace('_id', req.params.id);
    var opts = {
      filter: searchFilter,
      attributes: ad.objAttributes,
      scope: 'sub',
    };
    ldapClient.search(ad.searchBase, opts, false, function(err, result) {
      if (err) {
        return res.status(500).json(err);
      }
      if (result.length === 0) {
        return res.status(500).json({
          error: req.params.id + ' is not found!',
        });
      }
      if (result.length > 1) {
        return res.status(500).json({
          error: req.params.id + ' is not unique!',
        });
      }

      return res.json(result[0]);
    });
  });

  app.get('/adgroups/:id/photo', auth.ensureAuthenticated, function(req, res) {
    if (fs.existsSync(options.root + req.params.id + '.jpg')) {
      return res.sendFile(req.params.id + '.jpg', options);
    } else if (pending_photo[req.params.id]) {
      pending_photo[req.params.id].push(res);
    } else {
      pending_photo[req.params.id] = [res];
      fetch_photo_from_ad(req.params.id);
    }
  });

  app.get('/groupnames', auth.ensureAuthenticated, function(req, res) {
    if (ad.groupSearchFilter) {
      return listADGroups(req, res);
    }

    Group.find()
      .then(function(groups) {
        return res.json(groups);
      })
      .catch(function(err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      });
  });

  app.get('/adgroups', auth.ensureAuthenticated, function(req, res) {
    return listADGroups(req, res);
  });
};
