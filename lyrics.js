/* REQUIRES */
var SpotifyWebHelper = require('@jonny/spotify-web-helper')
const {ipcMain} = require('electron');
var portscanner = require('portscanner')
var http = require('http');

/* CONSTANTS */
API_KEY = ''; // it just works without a key ?!
API_LYRICS_URL = 'http://api.vagalume.com.br/search.php';
API_TIMING_URL = 'http://app2.vagalume.com.br/ajax/subtitle-get.php?action=getBestSubtitle';
UPDATE_INTERVAL = 250;

/* GLOBAL VARIABLES */
var helper; // spotify helper
var win; // app window, send/receive events
var current_track = {
  song: null,
  position: null,
  line: null,
  subtitles: null
} // playing (or paused) track
var updateTimings; // interval for updating lyrics position
var delay = 0;

/* FUNCTIONS */
function init (myWin) {
  // let's search for spotify port
  portscanner.findAPortInUse(4370, 4380, '127.0.0.1', function(error, port) {
    if ( error || !port ) {
      throw 'Spotify port not found. Is it running?'
      return;
    }

    win = myWin;
    helper = new SpotifyWebHelper({port: port})

    // wait for helper to be ready
    helper.player.on('ready', function() {
      //  catch errors
      helper.player.on('error', error_handler);

      // catch new songs
      helper.player.on('track-change', new_track);

      // catch pauses or endings
      helper.player.on('play', play_handler);
      helper.player.on('pause', pause_handler);

      // catch delay event from main window
      ipcMain.on('delay', function(event, arg) {
        update_delay(arg);
      });

      console.log('Spotify connected on port ' + port);
      win.send('spotify');
      new_track(helper.status.track)
    });
  })
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

function update () {
  if (!current_track.subtitles) return;

  var line = "";
  current_track.position = helper.status.playing_position - delay;
  for (var i = current_track.subtitles.length-1; i >= 0; i--)
    if (current_track.position >= current_track.subtitles[i][1]) {
      line = current_track.subtitles[i][0];
      break;
    }
  if (line && current_track.line != line) {
    console.log(line);
    win.send('update', i);
    current_track.line = line;
  }
}

/* EVENT HANDLERS */
function error_handler (err) { console.error(err); } // TODO: real error handling

function new_track (track) {
  clearInterval(updateTimings);
  current_track.song = track;
  win.send('song', track);
  console.log(`=== ${track.track_resource.name} ===\n=== ${track.artist_resource.name} ===`);
  fetchLyrics(track.track_resource.name, track.artist_resource.name, function (lyrics) {
    if (lyrics.type != 'exact' && lyrics.type != 'aprox') {
      console.log('Lyrics not found!')
      win.send('static-lyrics', null)
    }
    else {
      win.send('static-lyrics', lyrics.mus[0].text);
      fetchTimings(lyrics.mus[0].id, current_track.song.length, function (timings) {
        if ( !timings.langs ) {
          console.log('No synced lyrics available.');
          current_track.subtitles = null;
          win.send('dynamic-lyrics', null);
        }
        else {
          var lang_id = null;
          var subtitles;
          for (var i in timings.langs)
            if ( timings.langs[i].langAbbr === 'ENG' ) {
              lang_id = timings.langs[i].langID;
              break;
            }
          for (var i in timings.subtitles)
            if ( timings.subtitles[i].lID === lang_id ) {
              subtitles = timings.subtitles[i].text_compressed;
              break;
            }

          current_track.subtitles = subtitles;
          win.send('dynamic-lyrics', subtitles);
          updateTimings = setInterval(update, UPDATE_INTERVAL);
        }
      });
    }
  })
}

function play_handler () { updateTimings = setInterval(update, UPDATE_INTERVAL); }
function pause_handler () { clearInterval(updateTimings) }

function update_delay (new_value) {
  delay = new_value;
  // TODO: store value in a db
  // TODO very later: send value to shared server (musixmatch ?!)
}

module.exports.init = init;
