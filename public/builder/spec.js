(function() {
  var root = this,
    exports = {};

  // The jade runtime:
  var jade = (exports.jade = (function(exports) {
    Array.isArray ||
      (Array.isArray = function(arr) {
        return '[object Array]' == Object.prototype.toString.call(arr);
      }),
      Object.keys ||
        (Object.keys = function(obj) {
          var arr = [];
          for (var key in obj) obj.hasOwnProperty(key) && arr.push(key);
          return arr;
        }),
      (exports.merge = function merge(a, b) {
        var ac = a['class'],
          bc = b['class'];
        if (ac || bc)
          (ac = ac || []),
            (bc = bc || []),
            Array.isArray(ac) || (ac = [ac]),
            Array.isArray(bc) || (bc = [bc]),
            (ac = ac.filter(nulls)),
            (bc = bc.filter(nulls)),
            (a['class'] = ac.concat(bc).join(' '));
        for (var key in b) key != 'class' && (a[key] = b[key]);
        return a;
      });
    function nulls(val) {
      return val != null;
    }
    return (
      (exports.attrs = function attrs(obj, escaped) {
        var buf = [],
          terse = obj.terse;
        delete obj.terse;
        var keys = Object.keys(obj),
          len = keys.length;
        if (len) {
          buf.push('');
          for (var i = 0; i < len; ++i) {
            var key = keys[i],
              val = obj[key];
            'boolean' == typeof val || null == val
              ? val &&
                (terse ? buf.push(key) : buf.push(key + '="' + key + '"'))
              : 0 == key.indexOf('data') && 'string' != typeof val
              ? buf.push(key + "='" + JSON.stringify(val) + "'")
              : 'class' == key && Array.isArray(val)
              ? buf.push(key + '="' + exports.escape(val.join(' ')) + '"')
              : escaped && escaped[key]
              ? buf.push(key + '="' + exports.escape(val) + '"')
              : buf.push(key + '="' + val + '"');
          }
        }
        return buf.join(' ');
      }),
      (exports.escape = function escape(html) {
        return String(html)
          .replace(/&(?!(\w+|\#\d+);)/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }),
      (exports.rethrow = function rethrow(err, filename, lineno) {
        if (!filename) throw err;
        var context = 3,
          str = require('fs').readFileSync(filename, 'utf8'),
          lines = str.split('\n'),
          start = Math.max(lineno - context, 0),
          end = Math.min(lines.length, lineno + context),
          context = lines
            .slice(start, end)
            .map(function(line, i) {
              var curr = i + start + 1;
              return (curr == lineno ? '  > ' : '    ') + curr + '| ' + line;
            })
            .join('\n');
        throw ((err.path = filename),
        (err.message =
          (filename || 'Jade') +
          ':' +
          lineno +
          '\n' +
          context +
          '\n\n' +
          err.message),
        err);
      }),
      exports
    );
  })({}));

  // create our folder objects

  // add_radio_button.jade compiled template
  exports['add_radio_button'] = function tmpl_add_radio_button() {
    return '<div class="mb-3"><div class="form-label">Add Radio Button</div><button value="add_radio_button" class="btn btn-primary">+</button></div>';
  };

  // alt.jade compiled template
  exports['alt'] = function tmpl_alt() {
    return '<div class="mb-3"><div class="form-label">Image alternate text</div><input class="form-control" type="text" disabled="disabled" name="alt"/></div>';
  };

  // checkbox_text.jade compiled template
  exports['checkbox_text'] = function tmpl_checkbox_text() {
    return '<div class="mb-3"><div class="form-label">Text</div><input class="form-control" type="text" name="checkbox_text"/></div>';
  };

  // done.jade compiled template
  exports['done'] = function tmpl_done() {
    return '<button type="submit" class="btn btn-primary">Done</button>';
  };

  // figcaption.jade compiled template
  exports['figcaption'] = function tmpl_figcaption() {
    return '<div class="mb-3"><div class="form-label">Figure caption</div><input class="form-control" type="text" disabled="disabled" name="figcaption"/></div>';
  };

  // generic_text_input.jade compiled template
  exports['generic_text_input'] = function tmpl_generic_text_input(locals) {
    var buf = [];
    var locals_ = locals || {},
      label = locals_.label;
    buf.push(
      '<div class="mb-3"><div class="form-label">' +
        jade.escape((jade.interp = label) == null ? '' : jade.interp) +
        '</div><input class="form-control" type="text" name="radio_text"/></div>'
    );
    return buf.join('');
  };

  // height.jade compiled template
  exports['height'] = function tmpl_height() {
    return '<div class="mb-3"><div class="form-label">Height</div><input class="form-control" type="number" disabled="disabled" name="height" step="any"/></div>';
  };

  // help.jade compiled template
  exports['help'] = function tmpl_help() {
    return '<div class="mb-3"><div class="form-label">Help</div><input class="form-control" type="text" name="help"/></div>';
  };

  // hold.jade compiled template
  exports['hold'] = function tmpl_hold() {
    return '<div class="mb-3"><div class="form-label">Holder</div><input class="form-control" type="text" placeholder="Hold owner" name="holder"/></div>';
  };

  // imagefile.jade compiled template
  exports['imagefile'] = function tmpl_imagefile() {
    return '<div class="mb-3"><div class="form-label">Select an image</div><input class="form-control" name="userimage" type="file"/></div>';
  };

  // inputtype.jade compiled template
  exports['inputtype'] = function tmpl_inputtype() {
    return '<option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="datetime-local">Date Time</option><option value="email">Email</option><option value="tel">Phone number</option><option value="time">Time</option><option value="url">URL</option>';
  };

  // label.jade compiled template
  exports['label'] = function tmpl_label() {
    return '<div class="mb-3"><div class="form-label">Label</div><input class="form-control" type="text" name="label"/><div class="form-text"> Keep the label brief and unique</div></div>';
  };

  // legend.jade compiled template
  exports['legend'] = function tmpl_legend() {
    return '<div class="mb-3"><div class="form-label">Section legend</div><input class="form-control" type="text" name="legend"/></div>';
  };

  // max.jade compiled template
  exports['max'] = function tmpl_max() {
    return '<div class="mb-3"><div class="form-label">Max</div><input class="form-control" type="number" name="max" step="any"/></div>';
  };

  // min.jade compiled template
  exports['min'] = function tmpl_min() {
    return '<div class="mb-3"><div class="form-label">Min</div><input class="form-control" type="number" name="min" step="any"/></div>';
  };

  // placeholder.jade compiled template
  exports['placeholder'] = function tmpl_placeholder() {
    return '<div class="mb-3"><div class="form-label">Placeholder</div><input class="form-control" type="text" name="placeholder"/></div>';
  };

  // required.jade compiled template
  exports['required'] = function tmpl_required() {
    return '<div class="mb-3 form-check"><input class="form-check-input" type="checkbox" name="required"/><label class="form-check-label">Required</label></div>';
  };

  // rich_textarea.jade compiled template
  exports['rich_textarea'] = function tmpl_rich_textarea() {
    return '<div class="mb-3"><div class="form-label">Rich editor</div><div class="form-control"><textarea rows="10" class="tinymce"></textarea></div></div>';
  };

  // rows.jade compiled template
  exports['rows'] = function tmpl_rows() {
    return '<div class="mb-3"><div class="form-label">Row</div><input class="form-control" type="number" placeholder="Number of rows" name="rows"/></div>';
  };

  // type.jade compiled template
  exports['type'] = function tmpl_type() {
    return '<div class="mb-3"><div class="form-label">Type</div><div class="form-control"><select name="type"><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="datetime-local">Date Time</option><option value="email">Email</option><option value="tel">Phone number</option><option value="time">Time</option><option value="url">URL</option></select></div></div>';
  };

  // unit.jade compiled template
  exports['unit'] = function tmpl_unit() {
    return '<div class="mb-3"><div class="form-label">Unit</div><input class="form-control" type="text" name="unit"/></div>';
  };

  // userkey.jade compiled template
  exports['userkey'] = function tmpl_userkey() {
    return '<div class="mb-3"><div class="form-label">User defined key</div><input class="form-control" type="text" name="userkey" pattern="[a-zA-Z_0-9]{1,30}"/><div class="form-text">Only letter, number, and "_" allowed (Example: MagMeas_1)</div></div>';
  };

  exports['filetype'] = function tmpl_filetype() {
    return '<div class="mb-3"><div class="form-label">File type</div><input class="form-control" type="text" name="filetype" /><div class="form-text">Leave blank for default file formats (PDF, excel & image/text formats). Specify for a specific file format (ex: zip)</div></div>';
  };

  // width.jade compiled template
  exports['width'] = function tmpl_width() {
    return '<div class="mb-3"><div class="form-label">Width</div><input class="form-control" type="number" disabled="disabled" name="width" step="any"/></div>';
  };

  // attach to window or export with commonJS
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = exports;
  } else if (typeof define === 'function' && define.amd) {
    define(exports);
  } else {
    root.spec = exports;
  }
})();
