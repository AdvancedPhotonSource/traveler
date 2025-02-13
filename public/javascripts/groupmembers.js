function formatItemUpdate(data) {
  return (
    '<div class="target" id="' +
    data._id +
    '"><b>' +
    data.name +
    '</b>' +
    '</div>'
  );
}

function removeMembersFromModal(group, table) {
  $('#submit').prop('disabled', true);
  $('#return').prop('disabled', true);
  let data = [];
  $('#modal .modal-body div.target').each(function() {
    data.push({ _id: this.id });
  });
  $.ajax({
    url: '/groups/' + group + '/removeMembers',
    type: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify(data),
  })
    .done(function() {
      $('#modal .modal-body div.target').each(function() {
        $(this).prepend('<i class="fa fa-check"></i>');
        $(this).addClass('text-success');
      });
    })
    .fail(function(jqXHR) {
      $('#modal .modal-body div.target').each(function() {
        $(this).prepend('<i class="fa fa-exclamation"></i>');
        $(this).append(' : ' + jqXHR.responseText);
        $(this).addClass('text-error');
      });
    })
    .always(function() {
      $('#return').prop('disabled', false);
      table.fnReloadAjax();
    });
}

$(function() {
  updateAjaxURL(prefix);

  var memberColumns = [selectColumn, userIdColumn, fullNameNoLinkColumn];

  var memberTable = $('#members-table').dataTable({
    sAjaxSource: '/groups/' + group._id + '/members/json',
    sAjaxDataProp: '',
    /*fnInitComplete: function () {
            Holder.run({
                images: 'img.group',
            });
        },*/
    bAutoWidth: false,
    iDisplayLength: 10,
    aLengthMenu: [
      [10, 50, 100, -1],
      [10, 50, 100, 'All'],
    ],
    oLanguage: {
      sLoadingRecords: 'Please wait - loading data from the server ...',
    },
    bDeferRender: true,
    aoColumns: memberColumns,
    aaSorting: [[2, 'asc']],
    sDom: sDomNoTools,
  });
  fnAddFilterFoot('#members-table', memberColumns);

  selectEvent();
  filterEvent();

  $('#addusertogroup').click(function(e) {
    e.preventDefault();
    var that = this;
    var displayName = $('#username').val();
    $.ajax({
      url: '/groups/' + group._id + '/addmember/' + displayName,
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({}),
    })
      .done(function(data, status, jqXHR) {
        $('#message').append(
          '<div class="alert alert-success alert-dismissible"><button class="btn-close" data-bs-dismiss="alert"></button>' +
            'User ' +
            displayName +
            ' has been added to this group.' +
            '</div>'
        );
        memberTable.fnReloadAjax();
      })
      .fail(function(jqXHR) {
        $('#message').append(
          '<div class="alert alert-danger alert-dismissible"><button class="btn-close" data-bs-dismiss="alert"></button>' +
            jqXHR.responseText +
            '</div>'
        );
      })
      .always(function() {});
  });

  $('button#btnRemoveMembers').click(function() {
    var activeTable = $('#members-table').dataTable();
    var selected = fnGetSelected(activeTable, 'row-selected');
    if (selected.length === 0) {
      $('#modalLabel').html('Alert');
      $('#modal .modal-body').html('No user(s) have been selected!');
      $('#modal .modal-footer').html(
        '<button data-bs-dismiss="modal" aria-hidden="true" class="btn">Return</button>'
      );
      $('#modal').modal('show');
    } else {
      $('#modalLabel').html(
        'Remove the following ' + selected.length + ' users? '
      );
      $('#modal .modal-body').empty();
      selected.forEach(function(row) {
        var data = activeTable.fnGetData(row);
        $('#modal .modal-body').append(formatItemUpdate(data));
      });
      $('#modal .modal-footer').html(
        '<button id="submit" class="btn btn-primary">Confirm</button><button id="return" data-bs-dismiss="modal" aria-hidden="true" class="btn">Return</button>'
      );
      $('#modal').modal('show');

      $('#submit').click(function() {
        removeMembersFromModal(group._id, activeTable);
      });
    }
  });

  /*$('#btnRemoveMembers').click(function(e) {
    e.preventDefault();
    var that = this;
    $.ajax({
      url: '/groups/' + group._id + '/addmember/' + displayName,
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({}),
    })
      .success(function(data, status, jqXHR) {
        $('#message').append(
          '<div class="alert alert-success alert-dismissible"><button class="btn-close" data-bs-dismiss="alert"></button>' +
            'User ' +
            displayName +
            ' has been added to this group.' +
            '</div>'
        );
        $(that).addClass('text-success');
        memberTable.fnReloadAjax();
      })
      .fail(function(jqXHR) {
        $(that).append(' : ' + jqXHR.responseText);
        $(that).addClass('text-error');
      })
      .always(function() {});
  });*/

  $('#btnDisplayName').click(function(e) {
    e.preventDefault();
    var that = this;
    $.ajax({
      url: '/groups/' + group._id,
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ name: $('#displayName').val() }),
    })
      .done(function(data, status, jqXHR) {
        $('#message').append(
          '<div class="alert alert-success alert-dismissible"><button class="btn-close" data-bs-dismiss="alert"></button>' +
            'Display Name updated to "' +
            $('#displayName').val() +
            '"' +
            '</div>'
        );
      })
      .fail(function(jqXHR) {
        $('#message').append(
          '<div class="alert alert-danger alert-dismissible"><button class="btn-close" data-bs-dismiss="alert"></button>' +
            'Error: ' +
            jqXHR.responseText +
            '</div>'
        );
      });
  });
});
