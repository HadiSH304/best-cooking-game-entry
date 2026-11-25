// Keyboard and pointer input. One-shot presses (start, pause, serve, ingredient keys) are
// queued as bit flags and taken once by the loop, so a press between two frames is never lost
// and never counted twice. Pointer clicks are queued with their logical coordinates, so the
// loop can hit-test them against the layout rects.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SERVE = new Set(['KeyS']);
const TICKET_KEYS = new Set(['KeyQ', 'KeyW', 'KeyE']);
const BIN_KEYS = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8']);

export function createInput(canvas) {
  let actions = 0;
  let ticketKey = 0;
  let binKey = 0;
  const clicks = [];

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (SERVE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SERVE;
    } else if (TICKET_KEYS.has(event.code)) {
      if (!event.repeat) ticketKey = ['KeyQ', 'KeyW', 'KeyE'].indexOf(event.code) + 1;
    } else if (BIN_KEYS.has(event.code)) {
      if (!event.repeat) binKey = Number(event.code.slice(5));
    } else {
      return;
    }
    event.preventDefault();
  });

  canvas.addEventListener('pointerdown', (event) => {
    clicks.push(toLogical(event));
  });

  // A key released while the tab is hidden never sends keyup: one-shot keys need no release.
  window.addEventListener('blur', () => {
    actions = 0;
    ticketKey = 0;
    binKey = 0;
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The ticket number (1-3) pressed since the last call, or 0. */
    takeTicketKey() {
      const taken = ticketKey;
      ticketKey = 0;
      return taken;
    },
    /** The bin number (1-8) pressed since the last call, or 0. */
    takeBinKey() {
      const taken = binKey;
      binKey = 0;
      return taken;
    },
    /** The pointer clicks since the last call, in logical coordinates. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
  };
}
