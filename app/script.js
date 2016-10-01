var electron = require('electron');
var menu_help = require('./menu.js');
var toastr = require('toastr');
toastr.options = {
  "closeButton": false,
  "debug": false,
  "newestOnTop": false,
  "progressBar": true,
  "positionClass": "toast-bottom-center",
  "preventDuplicates": true,
  "onclick": null,
  "showDuration": "300",
  "hideDuration": "1000",
  "timeOut": "5000",
  "extendedTimeOut": "1000",
  "showEasing": "swing",
  "hideEasing": "linear",
  "showMethod": "fadeIn",
  "hideMethod": "fadeOut"
};

function listen (event_name, callback) {
  electron.ipcRenderer.on(event_name, (event, message) => {
    callback(message);
  })
}

var autoscrolling = true;
var delay = 0;
function updateDelay (newValue) {
  delay = newValue;
  electron.ipcRenderer.send('delay', delay/1000);
  $('#delay').html(`${delay} ms`);
  menu_help.update_delay(newValue);
  toastr.clear();
  toastr["info"](`Delay set to ${delay} ms.`);
}

var spotifyConnect = setTimeout(function () {
  // display an error message
  $('#loading').html('Error. Spotify not found.');
}, 10000);

listen('spotify', function () {
  clearTimeout(spotifyConnect);
  $('#loading').removeClass('hidden').html('Loading song...');
  toastr["success"]("Connected to Spotify");
})
listen('song', function (song) {
  toastr["info"]("Searching lyrics...");
  electron.ipcRenderer.send('delay', 0);
  updateDelay(0);
  menu_help.hide_delay();
  $('#title').html(song.track_resource.name);
  $('#artist').html(song.artist_resource.name);
  $('#loading').removeClass('hidden').html('Loading lyrics...');
  $('#lyrics').html('');
});
var staticTimeout = null;
listen('static-lyrics', function (lyrics) {
  // let's wait 500 msec then show the lyrics
  // (useful when waiting for the dynamic lyrics)
  toastr.clear();
  if (!lyrics) {
    toastr["error"]("Lyrics not found :(");
    $('#loading').addClass('hidden');
    $('#lyrics').html('Lyrics not found!');
    return;
  }

  toastr["info"]("Syncing...");
  $('#loading').html('Syncing...');
  staticTimeout = setTimeout(function () {
    $('#lyrics').html('');
    var tmp = lyrics.split('\n');
    for (var i in tmp) $('#lyrics').append(`<li>${tmp[i]}</li>`);
  }, 500);
});
listen('dynamic-lyrics', function (lyrics) {
  toastr.clear();
  if (!lyrics) {
    toastr["error"]("Timed lyrics not available");
    $('#loading').addClass('hidden');
    return;
  }

  toastr["success"]("Success!");
  $('#loading').addClass('hidden');
  menu_help.show_delay(delay);
  clearTimeout(staticTimeout);
  $('#lyrics').html('');
  for (var i in lyrics) $('#lyrics').append(`<li>${lyrics[i][0]}</li>`);
});
listen('update', function (index) {
  if (!index) return;
  $('.active').removeClass('active');
  $(`#lyrics > li:nth-child(${index+1})`).addClass('active');
  if ( autoscrolling )
    $('html, body').animate({
        scrollTop: $(".active").offset().top - 75
    }, 300);

});
