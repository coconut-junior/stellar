//assign tab click events
$(`[data-tab-target]`).each(function (index, value) {
  $(this).on('click', function (event) {
    $(`[data-tab-target]`).each(function (index, value) {
      $(this).attr('active', 'false');
    });

    $(this).attr('active', 'true');

    $(`[data-tab-page]`).each(function () {
      $(this).removeClass('active');
    });

    let target = $(this).attr('data-tab-target');
    $(`${target}`).addClass('active');
  });
});
