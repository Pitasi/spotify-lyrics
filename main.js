'use strict';

const {app, BrowserWindow} = require('electron');
const lyrics = require('./lyrics.js');
let win = null;

// Quit when all windows are closed.
app.on('window-all-closed', function () { app.quit() })

function start () {
  app.on('ready', () => {
    win = new BrowserWindow({
      height: 800,
      width: 700
    });

    win.loadURL('file://' + __dirname + '/app/index.html');
    //win.openDevTools();

    win.webContents.on('did-finish-load', () => {
      lyrics.init(win.webContents);
    });

    win.webContents.on('restart', () => {
      win.close();
      start();
    });

  });
}

start();
