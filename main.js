'use strict';

const {app, BrowserWindow, Menu} = require('electron');
const lyrics = require('./lyrics.js');
let win = null;

// Quit when all windows are closed.
app.on('window-all-closed', function () { app.quit() })

function start () {

  Menu.setApplicationMenu(new Menu())

  app.on('ready', () => {
    win = new BrowserWindow({
      height: 800,
      width: 700,
      show: false,
      devTools: false
    });

    win.loadURL('file://' + __dirname + '/app/index.html');

    win.once('ready-to-show', () => {
      win.show();
      win.setAlwaysOnTop(true);
    })

    win.webContents.on('did-finish-load', () => {
      lyrics.init(win.webContents);
    });

    win.webContents.on('restart', () => {
      win.destroy();
      start();
    });

  });
}

start();
