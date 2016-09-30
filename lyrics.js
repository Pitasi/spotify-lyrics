const {ipcMain} = require('electron');
var nodeSpotifyWebHelper = require('node-spotify-webhelper');
var portscanner = require('portscanner')
var http = require('http');
var tmp;
var spotifyClient;
var mainLoop;
var win;

API_KEY = '';
API_LYRICS_URL = 'http://api.vagalume.com.br/search.php';
API_TIMING_URL = 'http://app2.vagalume.com.br/ajax/subtitle-get.php?action=getBestSubtitle';

function init (myWin) {
  portscanner.findAPortInUse(4370, 4380, '127.0.0.1', function(error, port) {
    if ( error || !port ) {
      throw 'Spotify port not found. Is it running?'
      return;
    }
    win = myWin;
    return main( port );
  })
}

function listenEvent (name, callback) {
  ipcMain.on(name, function(event, arg) {
    callback(arg);
  });
}

function getCurrentTrack(spotifyClient, callback){
  spotifyClient.getStatus(function (err, res) {
    if (err) return console.error(err);
    callback(res);
  });
}

function fetchLyrics (title, artist, callback) {
  var url = API_LYRICS_URL + `?art=${artist}&mus=${title}&apikey=${API_KEY}`
  var req = http.get(url, function(response) {
    if (response.statusCode != 200) console.error('Invalid status code.');
    else {
      // Continuously update stream with data
      var body = '';
      response.on('data', function(d) {
          body += d;
      });
      response.on('end', function() {
          var parsed = JSON.parse(body);
          callback(parsed);
      });
    }
  }).on('error', (e) => {
    console.log(`Got error: ${e.message}`);
  });
}

function fetchTimings (id, duration, callback) {
  var url = API_TIMING_URL + `&pointerID=${id}&duration=${duration}`;
  var req = http.get(url, function(response) {
    if (response.statusCode != 200) console.error('Invalid status code.');
    else {
      var body = '';
      response.on('data', function(d) {
          body += d;
      });
      response.on('end', function() {
          var parsed = JSON.parse(body);
          callback(parsed);
      });
    }
  }).on('error', (e) => {
    console.log(`Got error: ${e.message}`);
  });
}

var updating = false;
var last_spotify_update = 0;
var last_known_position = 0;
var delay = 0;
var last_playing = null;
var paused = false;
function update (subtitles) {
  if (updating) return;
  updating = true;
  var now = Date.now();

  if ( paused || now - last_spotify_update > 5000 ) {
    // let's fetch from spotify client
    getCurrentTrack(spotifyClient, function(res){
      // check if song changed
      if (res.track.track_resource.name != last_playing) return new_song(res);

      // if paused skip everything
      paused = !res.playing;
      if ( paused ) {
        updating = false;
        return;
      }

      var line;
      for (var i = subtitles.length-1; i >= 0; i--)
        if (res.playing_position - delay >= subtitles[i][1]) {
          line = subtitles[i][0];
          break;
        }
      last_spotify_update = now;
      last_known_position = res.playing_position;

      if (line && tmp != line) {
        console.log(line);
        win.send('update', i);
        tmp = line;
      }

      updating = false;
    });
  }
  else {
    // let's use system clock
    var line;
    var current_position = (now - last_spotify_update)/1000 + last_known_position - delay;
    for (var i = subtitles.length-1; i >= 0; i--)
      if (current_position >= subtitles[i][1]) {
        line = subtitles[i][0];
        break;
      }
    if (line && tmp != line) {
      console.log(line);
      win.send('update', i);
      tmp = line;
    }
    updating = false;
  }
}

function new_song_helper(res){
  last_playing = res.track.track_resource.name;
  win.send('song', res);
  console.log(`=== ${res.track.track_resource.name} ===\n=== ${res.track.artist_resource.name} ===`);
  fetchLyrics(
    res.track.track_resource.name,
    res.track.artist_resource.name,
    function(song){
      win.send('static-lyrics', song.mus[0].text);
      fetchTimings(song.mus[0].id, res.length, function (timings) {
        win.send('dynamic-lyrics', timings.subtitles[0].text_compressed);
        mainLoop = setInterval(function () {
          update(timings.subtitles[0].text_compressed)
        }, 100);
      })
    });
}

function new_song (song) {
  if (mainLoop) clearInterval(mainLoop);
  updating = false;

  if (song) new_song_helper(song);
  else      getCurrentTrack(spotifyClient, new_song_helper);
}

function main(port) {
  listenEvent('delay', function (arg) {
    delay = arg;
  });

  spotifyClient = new nodeSpotifyWebHelper.SpotifyWebHelper({port: port});
  console.log('Connected to Spotify.');
  win.send('spotify');
  new_song(null);
}

module.exports = {
  init: init,
  main: main
}
