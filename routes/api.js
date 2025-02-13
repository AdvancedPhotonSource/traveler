/*eslint max-nested-callbacks: [1, 4], complexity: [2, 20]*/

var fs = require('fs');
var mongoose = require('mongoose');
var path = require('path');
var cheerio = require('cheerio');
var basic = require('basic-auth');
var routesUtilities = require('../utilities/routes.js');
var _ = require('lodash');
var form = require('../model/form');
var reqUtils = require('../lib/req-utils');
var logger = require('../lib/loggers').getLogger();
const mqttUtilities = require('../utilities/mqtt.js');
const DataError = require('../lib/error').DataError;
const multer = require('multer');
const config = require('../config/config.js');
const util = require('util');
const upload = multer(config.multerConfig);

var Form = mongoose.model('Form');
var ReleasedForm = mongoose.model('ReleasedForm');
var Traveler = mongoose.model('Traveler');
var Binder = mongoose.model('Binder');
var TravelerData = mongoose.model('TravelerData');
var TravelerNote = mongoose.model('TravelerNote');
var Log = mongoose.model('Log');

var WRITE_API_USER = 'api_write';

var FILE_UPLOAD_INPUT_TYPE = 'file';
var UPLOAD_API_INPUT_TYPES = [FILE_UPLOAD_INPUT_TYPE];
var ALLOWED_API_INPUT_TYPES = [
  'checkbox',
  'radio',
  'text',
  'textarea',
  'number',
  'date',
  'datetime-local',
  'email',
  'tel',
  'time',
  'url',
  'text',
];

// Allowed file types when extension is not specified on form.
var DEFAULT_ALLOWED_UPLOAD_FILE_EXT = [
  // Image
  'tif',
  'tiff',
  'webp',
  'svg',
  'png',
  'jpg',
  'jpeg',
  'ico',
  'gif',
  'bmp',
  'avif',
  // Text
  'css',
  'csv',
  'htm',
  'html',
  'ics',
  'odt',
  'php',
  'rtf',
  'txt',
  'xml',
  // application/pdf
  'pdf',
  //application/vnd.ms-excel
  'xls',
  //application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  'xlsx',
  // application/vnd.ms-xpsdocument
  'xps',
  //application/oxps
  'oxps',
];

/**
 * Checks if the api user who is logged in has write access.
 *
 * @param {Request} req  - Request object
 * @param {Response} res  - Response object
 * @param {function} next  - Callback to be called when successful
 * @returns {*|ServerResponse} error when no permissions exist for writing
 */
function checkSystemWritePermissions(req, res, next) {
  var credentials = basic(req);
  if (credentials.name !== WRITE_API_USER) {
    return res.status(401).json({
      error: 'Insufficient write privilages',
    });
  } else {
    next();
  }
}

function checkSystemOrUserWritePermissions(req, res, next) {
  if (req.user) {
    // Ldap user logged in (permission needs to be verified to specific entitiy being updated)
    next();
  } else {
    checkSystemWritePermissions(req, res, next);
  }
}

/**
 * Performs error checking, displays proper message back to user returns the data resulted from the mongo query
 * When successful, responds to user with the data or performs callback.
 *
 * @param err - Error from the mongo query
 * @param data - Data resulting from the mongo query
 * @param res - Response object
 * @param successCB - Optional call back variable will be executed when specified.
 * @returns {*} Error object or data object. Nothing when callback is performed
 */
function performMongoResponse(err, data, res, successCB) {
  if (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
  if (!data) {
    return res.status(410).send('gone');
  }
  if (successCB === undefined) {
    return res.status(200).json(data);
  } else {
    successCB();
  }
}

/**
 * Performs a search of parent entity and search of child entity. Displays any error messages if applicable.
 * When successful, responds to user with content entit(y/ies) referenced in the parent entity.
 *
 * @param parentEntity The parent entity object in which the content entity is referenced
 * @param parentEntityKey The key of the parent entity which references the content entity
 * @param contentEntity The entity for which is being requested that is referenced from parent entity
 * @param contentEntityKeys The keys that will be fetched from the db of the contnet entity
 * @param res Response object
 */
function performFindEntityReferencedContentsByParentEntityId(
  parentEntity,
  parentEntityId,
  parentEntityKey,
  contentEntity,
  contentEntityKeys,
  res
) {
  parentEntity.findById(parentEntityId, function(parentErr, parentObj) {
    performMongoResponse(parentErr, parentObj, res, function() {
      contentEntity
        .find(
          {
            _id: {
              $in: parentObj[parentEntityKey],
            },
          },
          contentEntityKeys
        )
        .lean()
        .exec(function(contentErr, contentObj) {
          performMongoResponse(contentErr, contentObj, res);
        });
    });
  });
}

module.exports = function(app) {
  app.get('/apis/travelers/', function(req, res) {
    var search = {
      archived: {
        $ne: true,
      },
    };
    if (req.query.hasOwnProperty('device')) {
      search.devices = {
        $in: [req.query.device],
      };
    }
    if (req.query.hasOwnProperty('formid')) {
      search['forms._id'] = {
        $in: [req.query.formid],
      };
    }
    if (req.query.hasOwnProperty('tag')) {
      search.tags = {
        $in: [req.query.tag],
      };
    }
    if (req.query.hasOwnProperty('userkey')) {
      search['mapping.' + req.query.userkey] = {
        $exists: true,
      };
    }
    Traveler.find(
      search,
      'title status devices tags mapping createdBy clonedBy createdOn deadline updatedBy updatedOn sharedWith finishedInput totalInput'
    )
      .lean()
      .exec(function(err, travelers) {
        performMongoResponse(err, travelers, res);
      });
  });

  app.get('/apis/tags/travelers/', function(req, res) {
    var search = {
      archived: {
        $ne: true,
      },
    };
    if (req.query.hasOwnProperty('device')) {
      search.devices = {
        $in: [req.query.device],
      };
    }
    Traveler.find(search, 'tags')
      .lean()
      .exec(function(err, travelers) {
        if (err) {
          console.error(err);
          return res.status(500).send(err.message);
        }
        var output = [];
        travelers.forEach(function(t) {
          output = _.union(output, t.tags);
        });
        res.status(200).json(output);
      });
  });

  app.get('/apis/keys/travelers/', function(req, res) {
    var search = {
      archived: {
        $ne: true,
      },
    };
    if (req.query.hasOwnProperty('device')) {
      search.devices = {
        $in: [req.query.device],
      };
    }
    Traveler.find(search, 'mapping')
      .lean()
      .exec(function(err, travelers) {
        if (err) {
          console.error(err);
          return res.status(500).send(err.message);
        }
        var output = [];
        travelers.forEach(function(t) {
          output = _.union(output, _.keys(t.mapping));
        });
        res.status(200).json(output);
      });
  });

  app.get('/apis/forms/', function(req, res) {
    var search = {
      archived: {
        $ne: true,
      },
    };
    if (req.query.hasOwnProperty('tag')) {
      search.tags = {
        $in: [req.query.tag],
      };
    }
    if (req.query.hasOwnProperty('userkey')) {
      search['mapping.' + req.query.userkey] = {
        $exists: true,
      };
    }
    Form.find(search, function(err, forms) {
      performMongoResponse(err, forms, res);
    });
  });

  app.get('/apis/forms/:id/', function(req, res) {
    Form.findById(req.params.id, function(err, forms) {
      performMongoResponse(err, forms, res);
    });
  });

  app.get('/apis/forms/:id/released/', function(req, res) {
    ReleasedForm.find({ 'base._id': req.params.id }).exec(function(err, forms) {
      performMongoResponse(err, forms, res);
    });
  });

  app.get('/apis/releasedForms/', function(req, res) {
    ReleasedForm.find({}, function(err, releasedForms) {
      performMongoResponse(err, releasedForms, res);
    });
  });

  app.get('/apis/releasedForms/:id/', function(req, res) {
    ReleasedForm.findById(req.params.id, function(err, releasedForms) {
      performMongoResponse(err, releasedForms, res);
    });
  });

  app.get('/apis/binders/', function(req, res) {
    Binder.find({}, function(err, binders) {
      performMongoResponse(err, binders, res);
    });
  });

  app.get('/apis/binders/:id/', function(req, res) {
    Binder.findById(req.params.id, function(err, binder) {
      performMongoResponse(err, binder, res);
    });
  });

  app.post(
    '/apis/create/binders/',
    routesUtilities.filterBody(
      ['binderTitle', 'description', 'userName'],
      true
    ),
    checkSystemWritePermissions,
    function(req, res) {
      var binderTitle = req.body.binderTitle;
      var userName = req.body.userName;
      var description = req.body.description;

      routesUtilities.binder.createBinder(
        binderTitle,
        description,
        userName,
        function(err, newBinder) {
          performMongoResponse(err, newBinder, res, function() {
            return res.status(201).json(newBinder);
          });
        }
      );
    }
  );

  app.post(
    '/apis/addWork/binders/:id/',
    routesUtilities.filterBody(['travelerIds', 'userName'], true),
    checkSystemWritePermissions,
    function(req, res) {
      Binder.findById(req.params.id, function(err, binder) {
        performMongoResponse(err, binder, res, function() {
          var userName = req.body.userName;
          routesUtilities.binder.addWork(binder, userName, req, res);
        });
      });
    }
  );

  app.post(
    '/apis/removeWork/binders/:id/',
    routesUtilities.filterBody(['workId', 'userName'], true),
    checkSystemWritePermissions,
    function(req, res) {
      Binder.findById(req.params.id, function(err, binder) {
        performMongoResponse(err, binder, res, function() {
          var userName = req.body.userName;
          var workId = req.body.workId;
          routesUtilities.binder.deleteWork(binder, workId, userName, req, res);
        });
      });
    }
  );

  app.get('/apis/travelers/:id/', function(req, res) {
    Traveler.findById(req.params.id, function(travelerErr, traveler) {
      performMongoResponse(travelerErr, traveler, res);
    });
  });

  app.put(
    '/apis/travelers/:id/status/',
    reqUtils.exist('id', Traveler),
    reqUtils.archived('id', false),
    checkSystemWritePermissions,
    function(req, res) {
      var doc = req[req.params.id];

      if ([1, 1.5, 2, 3, 4].indexOf(req.body.status) === -1) {
        return res.status(400).send('invalid status');
      }

      if (doc.status === req.body.status) {
        return res.status(204).send();
      }

      var stateTransition = require('../model/traveler').stateTransition;

      var target = _.find(stateTransition, function(t) {
        return t.from === doc.status;
      });

      if (target.to.indexOf(req.body.status) === -1) {
        return res.status(400).send('invalid status change');
      }

      doc.status = req.body.status;
      // user id
      doc.updatedBy = req.body.userId;
      doc.updatedOn = Date.now();
      mqttUtilities.postTravelerStatusChangedMessage(doc);
      doc.save(function(saveErr, newDoc) {
        if (saveErr) {
          logger.error(saveErr);
          return res.status(500).send(saveErr.message);
        }
        return res.status(200).json(newDoc);
      });
    }
  );

  app.put(
    '/apis/travelers/:id/data/upload',
    reqUtils.exist('id', Traveler),
    reqUtils.archived('id', false),
    reqUtils.status('id', [1]),
    checkSystemOrUserWritePermissions,
    upload,
    reqUtils.filter('body', ['name', 'userId']),
    reqUtils.hasAll('body', ['name']),
    reqUtils.sanitize('body', ['name', 'userId']),
    function(req, res) {
      performDataEntryVerifyAndSave(req, res, UPLOAD_API_INPUT_TYPES, function(
        req,
        res,
        errStatus,
        msg
      ) {
        if (errStatus) {
          // Cleanup uploaded data
          if (!req.files.isEmpty) {
            file = req.files.fileName;
            // Remove file
            fs.unlink(file.path, err => {
              if (err) {
                console.error(err);
              }
            });
          }
          return res.status(errStatus).send(msg);
        }
      });
    }
  );

  app.put(
    '/apis/travelers/:id/data/',
    reqUtils.exist('id', Traveler),
    reqUtils.archived('id', false),
    reqUtils.status('id', [1]),
    checkSystemOrUserWritePermissions,
    reqUtils.filter('body', ['name', 'value', 'userId']),
    reqUtils.hasAll('body', ['name', 'value']),
    reqUtils.sanitize('body', ['name', 'value', 'userId']),
    function(req, res) {
      performDataEntryVerifyAndSave(req, res, ALLOWED_API_INPUT_TYPES, function(
        req,
        res,
        errStatus,
        msg
      ) {
        if (errStatus) {
          return res.status(errStatus).send(msg);
        }
      });
    }
  );

  function performDataEntryVerifyAndSave(req, res, allowed_input_types, next) {
    var traveler = req[req.params.id];
    var fieldName = req.body.name;
    var fieldValue = req.body.value;
    var file = undefined;
    var inputUserId = req.body.userId;

    if (req.user) {
      // Standard User execution
      if (inputUserId !== undefined) {
        return next(
          req,
          res,
          500,
          'Insuffient privilates to specify user Id. Remove parameter and try again.'
        );
      }
      inputUserId = req.user.id;

      if (!reqUtils.canWrite(req, traveler)) {
        return next(
          req,
          res,
          401,
          'User does not have sufficient privilages for updating the traveler.'
        );
      }
    } else {
      // System account execution
      if (!inputUserId) {
        return next(
          req,
          res,
          500,
          'User id must be specified for this request.'
        );
      }
    }

    // Fetch inputType
    var traveler_html = traveler.forms[0].html;
    var result = cheerio.load(traveler_html);
    var inputs = result('input, textarea');
    inputType = undefined;
    var error = '';

    for (let i = 0; i < inputs.length; i += 1) {
      var input = result(inputs[i]);
      ittrInputName = input.attr('name');
      ittrInputType = input.attr('type');

      if (ittrInputName === fieldName) {
        if (ittrInputType === undefined) {
          ittrInputType = input[0].name;
        }
        inputType = ittrInputType;

        if (inputType === 'radio') {
          var allowed_val = input.attr('value');
          if (allowed_val == fieldValue) {
            error = undefined;
            break;
          } else {
            if (error.length == 0) {
              error = 'Allowed value needs to be specified: ' + allowed_val;
            } else {
              error += ', ' + allowed_val;
            }
          }
        } else {
          break;
        }
      }
    }

    if (error) {
      return next(req, res, 500, error);
    }

    if (inputType === undefined) {
      return next(req, res, 500, 'Input name provided was not found.');
    }

    if (allowed_input_types.indexOf(inputType) === -1) {
      return next(
        req,
        res,
        500,
        inputType + ' type entry is not supported by the API.'
      );
    }

    if (inputType === FILE_UPLOAD_INPUT_TYPE) {
      if (req.files.isEmpty || req.files.fileName === undefined) {
        return next(
          req,
          res,
          500,
          'File upload not specified or failed to upload.'
        );
      }

      var file = req.files.fileName;
      // TODO verify allowed file type.
      inputSpecifiedType = input[0].attribs['data-filetype'];
      if (inputSpecifiedType) {
        // file type specified for input
        if (inputSpecifiedType !== file.extension) {
          return next(
            req,
            res,
            500,
            file.extension +
              ' file extension uploaded, ' +
              inputSpecifiedType +
              ' file extension required.'
          );
        }
      } else if (
        DEFAULT_ALLOWED_UPLOAD_FILE_EXT.indexOf(file.extension) === -1
      ) {
        return next(
          req,
          res,
          500,
          file.extension + ' file extension is not allowed for this upload.'
        );
      }

      fieldValue = file.originalname;
    }

    var data = new TravelerData({
      traveler: traveler._id,
      name: fieldName,
      value: fieldValue,
      inputType: inputType,
      inputBy: inputUserId,
      inputOn: Date.now(),
    });

    if (file) {
      data.file = {
        path: file.path,
        encoding: file.encoding,
        mimetype: file.mimetype,
      };
    }

    data.save(function(dataErr, result) {
      if (dataErr) {
        logger.error(dataErr.message);
        if (dataErr instanceof DataError) {
          return next(req, res, dataErr.status, dataErr.message);
        }
        return next(req, res, 500, dataErr.message);
      }
      traveler.updatedBy = inputUserId;
      traveler.updatedOn = Date.now();
      mqttUtilities.postTravelerDataChangedMessage(data, traveler);
      traveler.data.push(data._id);
      // update the finished input number by reset
      routesUtilities.traveler.resetTouched(traveler, function() {
        // save traveler
        traveler.save(function(saveErr) {
          if (saveErr) {
            logger.error(saveErr);
            return next(req, res, 500, saveErr.message);
          }
          return res.status(201).json(result);
        });
      });
    });
  }

  /**
   * get the latest value for the given name from the data list
   * @param  {String} name input name
   * @param  {Array} data an arrya of TravelerData
   * @return {Number|String|null}      the value for the given name
   */
  function dataForName(name, data) {
    if (!name) {
      return null;
    }
    if (_.isEmpty(data)) {
      return null;
    }

    var found = data.filter(function(d) {
      return d.name === name;
    });
    // get the latest value from history
    if (found.length) {
      found.sort(function(a, b) {
        if (a.inputOn > b.inputOn) {
          return -1;
        }
        return 1;
      });
      return found[0].value;
    }
    return null;
  }

  /**
   * retrieve the json representation of the traveler including the properties
   * in the give list, and the key-value's in the mapping
   * @param  {Traveler} traveler the traveler mongoose object
   * @param  {Array} props    the list of properties to be included
   * @param  {Function} cb    callback function
   * @return {Object}         the json representation
   */
  function retrieveKeyvalue(traveler, props, cb) {
    var output = {};
    props.forEach(function(p) {
      output[p] = traveler[p];
    });
    var mapping = traveler.mapping;
    TravelerData.find(
      {
        _id: {
          $in: traveler.data,
        },
      },
      'name value inputOn inputType'
    ).exec(function(dataErr, docs) {
      if (dataErr) {
        return cb(dataErr);
      }
      var userDefined = {};
      _.mapKeys(mapping, function(name, key) {
        userDefined[key] = dataForName(name, docs);
      });
      output.user_defined = userDefined;
      return cb(null, output);
    });
  }

  /**
   * retrieve the json representation of the traveler including the properties
   * in the give list, and the {key, label, value}'s in the mapping
   * @param  {Traveler} traveler the traveler mongoose object
   * @param  {Array} props    the list of properties to be included
   * @param  {Function} cb    callback function
   * @return {Object}         the json representation
   */
  function retrieveKeyLableValue(traveler, props, cb) {
    var output = {};
    props.forEach(function(p) {
      output[p] = traveler[p];
    });
    var mapping = traveler.mapping;
    var labels = traveler.labels;
    TravelerData.find(
      {
        _id: {
          $in: traveler.data,
        },
      },
      'name value inputOn inputType'
    ).exec(function(dataErr, docs) {
      if (dataErr) {
        return cb(dataErr);
      }
      var userDefined = {};
      _.mapKeys(mapping, function(name, key) {
        userDefined[key] = {};
        userDefined[key].value = dataForName(name, docs);
        if (_.isObject(labels)) {
          userDefined[key].label = labels[name];
        }
      });
      output.user_defined = userDefined;
      return cb(null, output);
    });
  }

  app.get('/apis/travelers/:id/keyvalue/', function(req, res) {
    Traveler.findById(req.params.id, function(travelerErr, traveler) {
      retrieveKeyvalue(
        traveler,
        ['id', 'title', 'status', 'tags', 'devices'],
        function(err, output) {
          if (err) {
            return res.status(500).send(err.message);
          }
          return res.status(200).json(output);
        }
      );
    });
  });

  app.get('/apis/travelers/:id/keylabelvalue/', function(req, res) {
    Traveler.findById(req.params.id, function(travelerErr, traveler) {
      retrieveKeyLableValue(
        traveler,
        ['id', 'title', 'status', 'tags', 'devices'],
        function(err, output) {
          if (err) {
            return res.status(500).send(err.message);
          }
          return res.status(200).json(output);
        }
      );
    });
  });

  app.get('/apis/travelers/:id/data/', function(req, res) {
    var travelerId = req.params.id;
    var travelerDataKeys = 'name value inputType inputBy inputOn';
    performFindEntityReferencedContentsByParentEntityId(
      Traveler,
      travelerId,
      'data',
      TravelerData,
      travelerDataKeys,
      res
    );
  });

  app.get('/apis/travelers/:id/notes/', function(req, res) {
    var travelerId = req.params.id;
    var noteDataKeys = 'name value inputBy inputOn';
    performFindEntityReferencedContentsByParentEntityId(
      Traveler,
      travelerId,
      'notes',
      TravelerNote,
      noteDataKeys,
      res
    );
  });

  function retrieveLogs(traveler, cb) {
    if (_.isEmpty(traveler.discrepancyLogs)) {
      return cb(null, []);
    }

    // retrieve all log data in one find
    Log.find(
      {
        _id: {
          $in: traveler.discrepancyLogs,
        },
        referenceForm: traveler.referenceDiscrepancyForm,
      },
      'referenceForm records inputBy inputOn'
    ).exec(function(dataErr, logs) {
      if (dataErr) {
        logger.error(dataErr);
        return cb(dataErr);
      }
      return cb(null, logs);
    });
  }

  app.post(
    '/apis/archived/traveler/:id/',
    routesUtilities.filterBody(['archived'], true),
    checkSystemWritePermissions,
    function(req, res) {
      var archivedStatus = req.body.archived;

      Traveler.findById(req.params.id, function(travelerErr, traveler) {
        performMongoResponse(travelerErr, traveler, res, function() {
          routesUtilities.traveler.changeArchivedState(
            traveler,
            archivedStatus
          );
          traveler.save(function(err) {
            performMongoResponse(err, traveler, res, function() {
              return res.status(200).json(traveler);
            });
          });
        });
      });
    }
  );

  app.get('/apis/travelers/:id/log/', reqUtils.exist('id', Traveler), function(
    req,
    res
  ) {
    let traveler = req[req.params.id];
    retrieveLogs(traveler, function(err, output) {
      if (err) {
        return res.status(500).send(err.message);
      }
      return res.status(200).json({
        discrepancyForm: traveler.discrepancyForms.id(
          traveler.activeDiscrepancyForm
        ),
        discrepancyLogs: output,
      });
    });
  });

  app.get('/apis/data/:id/', function(req, res) {
    TravelerData.findById(req.params.id)
      .lean()
      .exec(function(err, data) {
        performMongoResponse(err, data, res, function() {
          res.status(200).json(data);
        });
      });
  });

  app.get('/apis/data/:id/file', function(req, res) {
    TravelerData.findById(req.params.id)
      .lean()
      .exec(function(err, data) {
        performMongoResponse(err, data, res, function() {
          if (data.inputType === 'file') {
            fs.exists(data.file.path, function(exists) {
              if (exists) {
                header_val = util.format('inline; filename="%s"', data.value);
                res.setHeader('Content-Disposition', header_val);
                return res.sendFile(path.resolve(data.file.path));
              }
              return res.status(410).send('gone');
            });
          } else {
            error_msg = util.format(
              "data is not a 'file' type. (found: %s)",
              data.inputType
            );
            return res.status(500).send(error_msg);
          }
        });
      });
  });

  app.post(
    '/apis/create/form/',
    routesUtilities.filterBody(['formName', 'userName', 'html'], true),
    checkSystemWritePermissions,
    function(req, res) {
      var formName = req.body.formName;
      var userName = req.body.userName;
      var html = req.body.html;
      var formType = req.body.formType;
      form.createForm(
        {
          title: formName,
          createdBy: userName,
          html: html,
          formType: formType,
        },
        function(err, newForm) {
          performMongoResponse(err, newForm, res, function() {
            return res.status(201).json(newForm);
          });
        }
      );
    }
  );

  app.post(
    '/apis/update/traveler/:id/',
    routesUtilities.filterBodyWithOptional(
      ['userName', 'title', 'description', 'deadline', 'status'],
      true,
      ['devices']
    ),
    checkSystemWritePermissions,
    function(req, res) {
      try {
        var status = parseFloat(req.body.status);
      } catch (ex) {
        return res.status(400).json({
          error: 'Status provided was of invalid type. Expected: Float.',
        });
      }

      Traveler.findById(req.params.id, function(travelerErr, traveler) {
        performMongoResponse(travelerErr, traveler, res, function() {
          routesUtilities.traveler.updateTravelerStatus(
            req,
            res,
            traveler,
            status,
            false,
            function() {
              var deadline = req.body.deadline;
              if (deadline === '') {
                traveler.deadline = undefined;
              } else {
                traveler.deadline = deadline;
              }
              traveler.title = req.body.title;
              traveler.description = req.body.description;
              traveler.updatedBy = req.body.userName;
              traveler.updatedOn = Date.now();
              if (req.body.devices) {
                traveler.devices = req.body.devices;
              }

              traveler.save(function(err) {
                performMongoResponse(err, traveler, res, function() {
                  return res.status(200).json(traveler);
                });
              });
            }
          );
        });
      });
    }
  );

  app.post(
    '/apis/create/traveler/',
    routesUtilities.filterBody(
      ['formId', 'title', 'userName', 'devices'],
      true
    ),
    checkSystemWritePermissions,
    function(req, res) {
      ReleasedForm.findById(req.body.formId, function(formErr, form) {
        performMongoResponse(formErr, form, res, function() {
          var title = req.body.title;
          var userName = req.body.userName;
          var devices = req.body.devices;
          routesUtilities.traveler.createTraveler(
            form,
            title,
            userName,
            devices,
            function(newTravelerErr, newTraveler) {
              performMongoResponse(
                newTravelerErr,
                newTraveler,
                res,
                function() {
                  return res.status(201).json(newTraveler);
                }
              );
            }
          );
        });
      });
    }
  );
};
