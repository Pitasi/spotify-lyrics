const {remote} = require('electron')
const {Menu, MenuItem} = remote

var show_delay = false;

function get_settings_menu (show_delay, ms) {

  return new MenuItem({
    label: 'Settings',
    submenu: [
      {
        label: 'Autoscroll',
        type: 'checkbox',
        enabled: show_delay,
        checked: true,
        click () { autoscrolling = !autoscrolling }
      },
      {
        label: 'Delay',
        enabled: show_delay,
        submenu: [
          {
            label: (ms || 0) + ' ms',
            enabled: false
          },
          {
            label: 'Less delay',
            accelerator: 'z',
            click () { updateDelay(delay - 200) }
          },
          {
            label: 'More delay',
            accelerator: 'x',
            click () { updateDelay(delay + 200) }
          }
        ]
      }
    ]
  });
}

const help_menu = new MenuItem({
  role: 'help',
  submenu: [
    {
      label: 'Fork me on GiHub!',
      click () { require('electron').shell.openExternal('https://github.com/Pitasi/spotify-lyrics') }
    }
  ]
})

function update_menu (delay) {
  const menu = new Menu()
  menu.append(get_settings_menu(show_delay, delay))
  menu.append(new MenuItem({type: 'separator'}))
  menu.append(help_menu)

  Menu.setApplicationMenu(menu)
}

update_menu(null);

/* TODO: right click menu
const menu = new Menu()
menu.append(new MenuItem({label: 'MenuItem1', click() { console.log('item 1 clicked') }}))
menu.append(new MenuItem({type: 'separator'}))
menu.append(new MenuItem({label: 'MenuItem2', type: 'checkbox', checked: true}))

window.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  menu.popup(remote.getCurrentWindow())
}, false)
*/

module.exports.hide_delay = function(){show_delay=false;update_menu(null)};
module.exports.show_delay = function(){show_delay=true;update_menu()};
module.exports.update_delay = function(value){update_menu(value)};
