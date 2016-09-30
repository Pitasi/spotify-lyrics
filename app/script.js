var electron = require('electron');
function listen (event_name, callback) {
  electron.ipcRenderer.on(event_name, (event, message) => {
    callback(message);
  })
}

var delay = 0;
function updateDelay (newValue) {
  delay = newValue;
  electron.ipcRenderer.send('delay', delay/1000);
  $('#delay').html(`${delay} ms`);
}

var spotifyConnect = setTimeout(function () {
  // display an error message
  $('#loading').html('Error. Spotify not found.');
  $('#retry').removeClass('hidden');
}, 10000);

listen('spotify', function () {
  clearTimeout(spotifyConnect);
  $('#retry').addClass('hidden');
  $('#loading').removeClass('hidden').html('Loading song...');
})
listen('song', function (song) {
  updateDelay(0);
  electron.ipcRenderer.send('delay', 0);
  $('#title').html(song.track_resource.name);
  $('#artist').html(song.artist_resource.name);
  $('#control').addClass('hidden');
  $('#loading').removeClass('hidden').html('Loading lyrics...');
  $('#lyrics').html('');
});
var staticTimeout = null;
listen('static-lyrics', function (lyrics) {
  // let's wait 500 msec then show the lyrics
  // (useful when waiting for the dynamic lyrics)
  if (!lyrics) {
    $('#loading').addClass('hidden');
    $('#lyrics').html('Lyrics not found!');
    return;
  }
  $('#control').addClass('hidden');
  $('#loading').html('Syncing...');
  staticTimeout = setTimeout(function () {
    $('#lyrics').html('');
    var tmp = lyrics.split('\n');
    for (var i in tmp) $('#lyrics').append(`<li>${tmp[i]}</li>`);
  }, 500);
});
listen('dynamic-lyrics', function (lyrics) {
  if (!lyrics) {
    $('#loading').addClass('hidden');
    return;
  }
  $('#loading').addClass('hidden');
  $('#control').removeClass('hidden');
  clearTimeout(staticTimeout);
  $('#lyrics').html('');
  for (var i in lyrics) $('#lyrics').append(`<li>${lyrics[i][0]}</li>`);
});
listen('update', function (index) {
  $('.active').removeClass('active');
  $(`#lyrics > li:nth-child(${index+1})`).addClass('active');
  $('html, body').animate({
      scrollTop: $(".active").offset().top - 75
  }, 300);

});

$('#more-delay').click(function () { updateDelay(delay + 200) });
$('#less-delay').click(function () { updateDelay(delay - 200) });
$('#retry').click(function () { electron.ipcRenderer.send('restart'); });
