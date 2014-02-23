jQuery(function($) {

  var DATA_DIR = 'data/unstable-amd64'; // FIXME generalize this later

  var handlers = {};
  function on(hash, f) {
    handlers[hash] = f;
  }
  var patterns = [];
  function match(pattern, f) {
    patterns.push([pattern, f]);
  }

  $(window).on('hashchange', function() {
    var hash = window.location.hash;
    if (handlers[hash]) {
      handlers[hash]();
    } else {
      for (i in patterns) {
        var p = patterns[i][0];
        var h = patterns[i][1];
        var match = hash.match(p);
        if (match) {
          h(match);
          return;
        }
      }
    }
  });

  function switch_to(id) {
    $('#main > div').hide();
    $(id).show()
  }

  on('', function() {
    switch_to('#status');

    $.get(DATA_DIR + '/status/history.json', function(data) {

      if (data.length < 2) {
        $('.chart').html("Not enough data for plot. Wait until the next run");
        return;
      }

      var pass = [];
      var fail = [];
      var duration = [];
      var max_duration = 0;
      $.each(data, function(index, entry) {
        pass.push([Date.parse(entry.date), entry.pass]);
        fail.push([Date.parse(entry.date), entry.fail]);
        duration.push([Date.parse(entry.date), entry.duration]);
        if (entry.duration && entry.duration > max_duration) {
          max_duration = entry.duration;
        }
      });

      var pass_fail_data= [ { label: "Pass", data: pass }, { label: "Fail", data: fail }];

      $.plot("#chart-pass-fail", pass_fail_data, {
        series: {
          stack: true,
          lines: {
            show: true,
            fill: true,
            steps: false,
          }
        },
        colors: [ '#8ae234', '#ef2929' ],
        legend: {
          show: true,

        },
        xaxis: {
          mode: "time"
        },
        yaxis: {
          min: 0
        }
      });

      var max_hours = Math.round(max_duration / 3600) + 1;
      var duration_ticks = [];
      for (var i = 0; i <= max_hours; i++) {
        duration_ticks.push([i * 3600, i + 'h']);
        console.log(i);
      }
      console.log(duration_ticks);
      $.plot('#chart-run-duration', [duration], {
        series: {
          lines: {
            show: true
          }
        },
        xaxis: {
          mode: 'time',
        },
        yaxis: {
          min: 0,
          ticks: duration_ticks
        }
      });

    })
  });

  on('#packages', function() {
    switch_to('#packages');
    $('#package-search').focus();
  });

  match(/^#package\/(\S+)$/, function(params) {
    switch_to('#packages');

    var pkg = params[1];
    display_details(pkg);
  });


  $.get(DATA_DIR + '/packages.json', function(data) {
    $.each(data, function(index, item) {
      var $link = $('<a></a>');
      $link.addClass(item.status)
      $link.attr('href', '#package/' + item.package);
      $link.attr('title', item.message);
      $link.html(item.package + ' (' + item.version + ')')

      var $list_item = $('<li></li>');
      $list_item.attr('data-package', item.package);
      $list_item.append($link);

      $('#package-select').append($list_item);
    });
  });

  $('#package-search').keyup(function() {
      var query = $(this).val();
      console.log("query = '" + query + "'");
      if (query.length > 0) {
        $('.request-search').hide();
        var found = 0;
        $('#package-select li').each(function() {
          if ($(this).attr('data-package').match(query)) {
            $(this).show();
            found++;
          } else {
            $(this).hide();
          }
        });
        $('.search-count .count').html(found);
        $('.search-count').show();
      } else {
        $('.request-search').show();
        $('.search-count').hide();
        $('#package-select li').show();
      }
  });

  function display_details(pkg) {
    var pkg_dir = pkg.replace(/^((lib)?.)/, "$1/$&");
    var url = DATA_DIR + '/packages/' + pkg_dir + '/history.json';

    var $target = $('#package-details')
    $target.html('');
    $.get(url, function(history) {
      $target.append("<h1>" + pkg + "</h1>");

      if (history[0]) {
        $('#package-details h1').addClass(history[0].status);
      }

      $target.append("<table class='table table-condensed'><tr><th>Version</th><th>Date</th><th>Duration</th><th>Status</th><th>Log</th></tr></table>");
      $.each(history, function(index, entry) {
        var log = DATA_DIR + '/packages/' + pkg_dir + '/' + entry.date + ".log";
        $target.find('table').append("<tr><td>" + entry.version + "</td><td>" + entry.date + "</td><td>" + entry.duration_human + "</td><td class='" + entry.status + "'>" + entry.status + "</td><td><a href='" + log + "'>view log</a></td></tr>")
      });

      var data_base = window.location.href.replace(/\/#.*/, '');
      var automation_info =
        "<p>Automate:</p>" +
        "<pre><code>" +
        "# latest status of the package\n" +
        "$ curl " + data_base + "/" + DATA_DIR + "/packages/" + pkg_dir + '/latest.json\n' +
        "\n" +
        "# test run history of the package\n" +
        "$ curl " + data_base + "/" + DATA_DIR + "/packages/" + pkg_dir + '/history.json\n' +
        "</code></pre>";
      $target.append(automation_info);

    }).fail(function() {
      $target.html(
        '<h1 class="fail">Package <em>' + pkg + '</em> not found</h1>');
    });
  }

  $(window).trigger('hashchange');

});
