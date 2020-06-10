const {fromJsString} = require('../../util/strings.js')
const ansiEscapes = require('ansi-escapes')
const ansiStyles = require('ansi-styles')

const ansiFaff = {
  cursor_to: (x, y) => ansiEscapes.cursorTo(x,y),
  cursor_move: (x, y) => ansiEscapes.cursorMove(x,y),
  cursor_up: (n) => ansiEscapes.cursorUp(n),
  cursor_down: (n) => ansiEscapes.cursorDown(n),
  cursor_forward: (n) => ansiEscapes.cursorForward(n),
  cursor_backward: (n) => ansiEscapes.cursorBackward(n),
  erase_lines: (n) => ansiEscapes.eraseLines(n),
  cursor_left: () => '\u001b[G',
  cursor_save_position: () => '\u001b[s',
  cursor_restore_position: () => '\u001b[u',
  cursor_get_position: () => '\u001b[6n',
  cursor_next_line: () => '\u001b[E',
  cursor_prev_line: () => '\u001b[F',
  cursor_hide: () => '\u001b[?25l',
  cursor_show: () => '\u001b[?25h',
  erase_end_line: () => '\u001b[K',
  erase_start_line: () => '\u001b[1K',
  erase_line: () => '\u001b[2K',
  erase_down: () => '\u001b[J',
  erase_up: () => '\u001b[1J',
  erase_screen: () => '\u001b[2J',
  scroll_up: () => '\u001b[S',
  scroll_down: () => '\u001b[T',
  clear_screen: () => '\u001bc',
  clear_terminal: () => '\u001b[2J\u001b[3J\u001b[H',
  bold: () => ansiStyles.bold.open,
  bold_close: () => ansiStyles.bold.close,
  color: (r, g, b) => ansiStyles.color.ansi16m.rgb(parseInt(r), parseInt(g), parseInt(b)),
  bg_color: (r, g, b) => ansiStyles.bgColor.ansi16m.rgb(parseInt(r), parseInt(g), parseInt(b)),
  color_reset: () => ansiStyles.color.close,
  bg_color_reset: () => ansiStyles.bgColor.close,
}

const ansi = Object.keys(ansiFaff).map(key => (
  {
    functionId: `ansi_${key}`,
    module: 'bif',
    exec: (_, __, ...args) => fromJsString(ansiFaff[key](...args))
  }
))

module.exports = {ansi}
