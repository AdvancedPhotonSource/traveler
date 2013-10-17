var mce_head = {
  inline: true,
  browser_spellcheck : true,
  plugins: "charmap",
  toolbar: "undo redo | subscript superscript charmap",
  menubar: false,
  statusbar: false
};

var mce_content = {
  inline: true,
  browser_spellcheck : true,
  plugins: [["advlist autolink link image lists charmap print preview hr anchor pagebreak spellchecker"],
      ["searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking"],
      ["save table contextmenu directionality emoticons template paste"]],
  toolbar1: "subscript superscript charmap | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
  toolbar2: "undo redo | removeformat | fontselect fontsizeselect | bold italic underline strikethrough",
  contextmenu: "charmap link image",
  menubar: false,
  statusbar: false
};


// var input_test = require(['../builder/input']);

$(function() {
  init();
  working();
  item_click();
});

function init () {
  $('#add-item-form').hide();
  $('#form-title h3.tinymce').tinymce(mce_head);
  $('#form-title div.tinymce').tinymce(mce_content);
  $('#adjust').click(function(e){
    if ($(this).text() == 'Adjust') {
      $(this).text('Done');
      $('#input-items').attr('disabled', true);
      $('#struct-items').attr('disabled', true);
      $('#save').attr('disabled', true);
      $('#output').sortable({
        placeholder: "ui-state-highlight"
      });
    } else {
      $(this).text('Adjust');
      $('#input-items').removeAttr('disabled');
      $('#struct-items').removeAttr('disabled');
      $('#save').removeAttr('disabled');
      $('#output').sortable('destroy');
    }
    e.preventDefault();
  });
  $('#output').on('mouseenter', '.control-group-wrap', function(e){
    e.preventDefault();
    if (!$(this).hasClass('control-focus')) {
      $(this).addClass('control-focus');
      $(this).prepend(input.button());
    }
  });
  $('#output').on('mouseleave', '.control-group-wrap', function(e){
    e.preventDefault();
    if ($(this).hasClass('control-focus')) {
      $(this).removeClass('control-focus');
      $('.control-group-buttons', $(this)).remove();
    }
  });

}

function working () {
/*  $('#add-checkbox').click(function(e){
    clean_ko();
    $('#add-item-form').empty();
    $('#add-item-form').show();
    var legend = $('#legend legend').clone().text('Add checkbox').show();
    var label = $('#label .control-group').clone().show();
    var label_text = $('#label-text .control-group').clone().show();
    var button = $('#button .form-actions').clone().show();
    $('#add-item-form').append(legend);
    $('#add-item-form').append(label);
    $('#add-item-form').append(label_text);
    $('#add-item-form').append(button);

    // the output part
    var element = $('#checkbox-element .control-group').clone().show();
    element.prepend($('#control-group-buttons .btn-group').clone());
    $('#output').append(element);
    $('input', label).attr("data-bind", "value: label, valueUpdate: 'afterkeydown'");
    $('input', label_text).attr("data-bind", "value: label_text, valueUpdate: 'afterkeydown'");
    $('.control-label span', element).attr("data-bind", "text: label");
    $('label span', element).attr("data-bind", "text: label_text");
    var formModel = function (init) {
      this.label = ko.observable(init);
      this.label_text = ko.observable("");
    };
    ko.applyBindings(new formModel("update me"));
    binding_button();
    e.preventDefault();
  });*/
  $('#add-checkbox').click(function(e){
    var checkbox = $(input.checkbox());
    $('#output').append($('<div class="control-group-wrap"></div>').append(checkbox));
    var label = $(spec.label());
    var checkbox_text = $(spec.checkbox_text());
    var done = $(spec.done());
    var edit = $('<div class="well spec"></div>').append(label, checkbox_text, done);
    $('#output').append(edit);
    $('input', label).attr("data-bind", "value: label, valueUpdate: 'afterkeydown'");
    $('input', checkbox_text).attr("data-bind", "value: label_text, valueUpdate: 'afterkeydown'");
    $('.control-label span', checkbox).attr("data-bind", "text: label");
    $('label span', checkbox).attr("data-bind", "text: label_text");
    var formModel = function (init) {
      this.label = ko.observable(init);
      this.label_text = ko.observable("update me as well");
    };
    ko.applyBindings(new formModel("update me"));
    binding_button(done);
    e.preventDefault();
  });

  $('#add-text').click(function(e){
    clean_ko();
    $('#add-item-form').empty();
    $('#add-item-form').show();
    var legend = $('#legend legend').clone().text('Add text input').show();
    var label = $('#label .control-group').clone().show();
    var placeholder = $('#placeholder .control-group').clone().show();
    var inline = $('#inline .control-group').clone().show();
    var button = $('#button .form-actions').clone().show();
    $('#add-item-form').append(legend);
    $('#add-item-form').append(label);
    $('#add-item-form').append(placeholder);
    $('#add-item-form').append(inline);
    $('#add-item-form').append(button);

    var element = $('#text-element .control-group').clone().show();
    element.prepend($('#control-group-buttons .btn-group').clone());
    $('#output').append(element);

    $('input', label).attr("data-bind", "value: label, valueUpdate: 'afterkeydown'");
    $('.control-label span', element).attr("data-bind", "text: label");

    $('input', placeholder).attr("data-bind", "value: placeholder, valueUpdate: 'afterkeydown'");
    $('input', element).attr("data-bind", "attr: {placeholder: placeholder}");

    $('input', inline).attr("data-bind", "value: inline, valueUpdate: 'afterkeydown'");
    $('span.help-inline', element).attr("data-bind", "text: inline");

    var formModel = function (init) {
      this.label = ko.observable(init);
      this.placeholder = ko.observable("");
      this.inline = ko.observable("");
    };
    ko.applyBindings(new formModel("Update me"));
    binding_button();
    e.preventDefault();
  });

  $('#add-par').click(function(e){
    clean_ko();
    $('#add-item-form').empty();
    $('#add-item-form').show();
    var legend = $('#legend legend').clone().text('Add paragraph input').show();
    var label = $('#label .control-group').clone().show();
    var placeholder = $('#placeholder .control-group').clone().show();
    var inline = $('#inline .control-group').clone().show();
    var rows = $('#rows .control-group').clone().show();
    var button = $('#button .form-actions').clone().show();
    $('#add-item-form').append(legend);
    $('#add-item-form').append(label);
    $('#add-item-form').append(placeholder);
    $('#add-item-form').append(inline);
    $('#add-item-form').append(rows);
    $('#add-item-form').append(button);

    var element = $('#textarea-element .control-group').clone().show();
    element.prepend($('#control-group-buttons .btn-group').clone());
    $('#output').append(element);
    $('input', label).attr("data-bind", "value: label, valueUpdate: 'afterkeydown'");
    $('input', placeholder).attr("data-bind", "value: placeholder, valueUpdate: 'afterkeydown'");
    $('input', rows).attr("data-bind", "value: rows, valueUpdate: 'afterkeydown'");
    $('input', inline).attr("data-bind", "value: inline, valueUpdate: 'afterkeydown'");

    $('span.help-inline', element).attr("data-bind", "text: inline");
    $('.control-label span', element).attr("data-bind", "text: label");
    $('textarea', element).attr("data-bind", "attr: {placeholder: placeholder, rows: rows}");

    var formModel = function (init) {
      this.label = ko.observable(init);
      this.placeholder = ko.observable("");
      this.inline = ko.observable("");
      this.rows = ko.observable(3);
    };
    ko.applyBindings(new formModel("Update me"));
    binding_button();
    e.preventDefault();
  });

  $('#add-int').click(function(e){
    clean_ko();
    $('#add-item-form').empty();
    $('#add-item-form').show();
    var legend = $('#legend legend').clone().text('Add integer input').show();
    var label = $('#label .control-group').clone().show();
    var placeholder = $('#placeholder .control-group').clone().show();
    var inline = $('#inline .control-group').clone().show();
    var unit = $('#unit .control-group').clone().show();
    var button = $('#button .form-actions').clone().show();
    $('#add-item-form').append(legend);
    $('#add-item-form').append(label);
    $('#add-item-form').append(placeholder);
    $('#add-item-form').append(unit);
    $('#add-item-form').append(inline);
    $('#add-item-form').append(button);

    var element = $('#number-element .control-group').clone().show();
    element.prepend($('#control-group-buttons .btn-group').clone());
    $('#output').append(element);

    $('input', label).attr("data-bind", "value: label, valueUpdate: 'afterkeydown'");
    $('.control-label span', element).attr("data-bind", "text: label");

    $('input', placeholder).attr("data-bind", "value: placeholder, valueUpdate: 'afterkeydown'");
    $('input', element).attr("data-bind", "attr: {placeholder: placeholder}");

    $('input', unit).attr("data-bind", "value: unit, valueUpdate: 'afterkeydown'");
    $('span.add-on', element).attr("data-bind", "text: unit");

    $('input', inline).attr("data-bind", "value: inline, valueUpdate: 'afterkeydown'");
    $('span.help-inline', element).attr("data-bind", "text: inline");

    var formModel = function (init) {
      this.label = ko.observable(init);
      this.placeholder = ko.observable("");
      this.unit = ko.observable("U");
      this.inline = ko.observable("");
    };
    ko.applyBindings(new formModel("Update me"));
    // TODO: add integer validation rule
    binding_button();
    e.preventDefault();
  });

  $('#add-float').click(function(e){
    clean_ko();
    $('#add-item-form').empty();
    $('#add-item-form').show();
    var legend = $('#legend legend').clone().text('Add float input').show();
    var label = $('#label .control-group').clone().show();
    var placeholder = $('#placeholder .control-group').clone().show();
    var inline = $('#inline .control-group').clone().show();
    var unit = $('#unit .control-group').clone().show();
    var button = $('#button .form-actions').clone().show();
    $('#add-item-form').append(legend);
    $('#add-item-form').append(label);
    $('#add-item-form').append(placeholder);
    $('#add-item-form').append(unit);
    $('#add-item-form').append(inline);
    $('#add-item-form').append(button);

    var element = $('#number-element .control-group').clone().show();
    element.prepend($('#control-group-buttons .btn-group').clone());
    $('#output').append(element);

    $('input', label).attr("data-bind", "value: label, valueUpdate: 'afterkeydown'");
    $('.control-label span', element).attr("data-bind", "text: label");

    $('input', placeholder).attr("data-bind", "value: placeholder, valueUpdate: 'afterkeydown'");
    $('input', element).attr("data-bind", "attr: {placeholder: placeholder}");

    $('input', unit).attr("data-bind", "value: unit, valueUpdate: 'afterkeydown'");
    $('span.add-on', element).attr("data-bind", "text: unit");

    $('input', inline).attr("data-bind", "value: inline, valueUpdate: 'afterkeydown'");
    $('span.help-inline', element).attr("data-bind", "text: inline");

    var formModel = function (init) {
      this.label = ko.observable(init);
      this.placeholder = ko.observable("");
      this.unit = ko.observable("U");
      this.inline = ko.observable("");
    };
    ko.applyBindings(new formModel("Update me"));
    // TODO: add float validation rule
    binding_button();
    e.preventDefault();
  });

  // $('#add-file').click(function(e){
  //   $('#add-item-form').show();
  //   clean_ko();
  //   $('#add-item-form legend').text('File');
  //   $('.add-item').hide(100, function(){
  //     $('#add-item-form legend').show();
  //     $('#upload').show();
  //     $('#button').show();
  //   });
  //   e.preventDefault();
  // });

  $('#add-rich').click(function(e){
    // the output part
    var element = $('#rich-element .control-group').clone().show();
    element.prepend($('#control-group-buttons .btn-group').clone());
    $('#output').append(element);
    // $('h3.instruction-title', element).tinymce(mce_head);
    $('.instruction-content', element).tinymce(mce_content);
    e.preventDefault();
  });

  $('#add-hold').click(function(e){
    clean_ko();
    $('#add-item-form').empty();
    $('#add-item-form').show();
    var legend = $('#legend legend').clone().text('Add hold point').show();
    var hold = $('#hold .control-group').clone().show();
    var button = $('#button .form-actions').clone().show();
    $('#add-item-form').append(legend);
    $('#add-item-form').append(hold);
    $('#add-item-form').append(button);

    // the output part
    var element = $('#hold-element .control-group').clone().show();
    element.prepend($('#control-group-buttons .btn-group').clone());
    $('#output').append(element);
    $('input', hold).attr("data-bind", "value: label, valueUpdate: 'afterkeydown'");
    $('.holder span', element).attr("data-bind", "text: label");
    var formModel = function (init) {
      this.label = ko.observable(init);
    };
    ko.applyBindings(new formModel("Name"));
    binding_button();
    e.preventDefault();
  });

  $('#add-file').click(function(e){
    clean_ko();
    $('#add-item-form').empty();
    $('#add-item-form').show();
    var legend = $('#legend legend').clone().text('Add upload file').show();
    var label = $('#upload .control-group').clone().show();
    var button = $('#button .form-actions').clone().show();
    $('#add-item-form').append(legend);
    $('#add-item-form').append(label);
    $('#add-item-form').append(button);

    // the output part
    var element = $('#upload-element .control-group').clone().show();
    element.prepend($('#control-group-buttons .btn-group').clone());
    $('#output').append(element);
    $('input', label).attr("data-bind", "value: label, valueUpdate: 'afterkeydown'");
    $('.control-label span', element).attr("data-bind", "text: label");
    var formModel = function (init) {
      this.label = ko.observable(init);
    };
    ko.applyBindings(new formModel("update me"));
    binding_button();
    e.preventDefault();
  });

  $('#add-page').click(function(e){
    e.preventDefault();
  });

}

function item_click() {
  $('#output').on('click', 'a.btn.btn-warning[title="remove"]', function(e){
    $(this).closest('.control-group').remove();
    e.preventDefault();
  });
}

function clean_ko() {
  $('#add-item-form input').each(function(index) {
    ko.cleanNode(this);
  });

  $('#output [data-bind]').removeAttr('data-bind');
  $('#add-item-form [data-bind]').removeAttr('data-bind');
}

function binding_button(done) {
  $('button[type="submit"]', done).click(function(e){
    clean_ko();
    $(done).closest('.spec').remove();
    e.preventDefault();
  });
}