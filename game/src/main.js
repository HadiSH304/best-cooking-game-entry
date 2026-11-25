// Boot and the one loop: input is read every frame, the kitchen advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is there.
// The game moves between four screens: title, play, paused and shift over.
//
// ?seed=N fixes the order pattern. ?shot=cover|orders|serve|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.
import { BEST_KEY, INGREDIENTS, LAYOUT, STEP } from './config.js';
import { createRandom } from './random.js';
import { createKitchen, EVENT_LOST, EVENT_OVER, EVENT_SERVED, EVENT_WRONG } from './kitchen.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_SERVE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './draw.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const kitchen = createKitchen(createRandom(seed));
const renderer = createRenderer(canvas);

// Test handle: lets an automated play-test read the kitchen and drive the same clicks a
// player makes, without changing how the game plays.
window.__dapurKilat = { kitchen, layout: LAYOUT, ingredients: INGREDIENTS };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function inside(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function runShot(name) {
  const scene = stageShot(name, kitchen);
  let painted = 0;
  function paint() {
    renderer.draw(kitchen.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    kitchen.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Bermain. Sajikan pesanan sebelum pelanggan kehabisan sabar.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (kitchen.state.score > best) {
      best = kitchen.state.score;
      saveBest(best);
    }
    announce(`Shift selesai. Skor ${kitchen.state.score}. Terbaik ${best}.`);
  }

  function handleClick(x, y) {
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Bermain.');
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const state = kitchen.state;
    for (let index = 0; index < state.orders.length; index += 1) {
      const ticket = {
        x: LAYOUT.ticket.x0 + index * (LAYOUT.ticket.w + LAYOUT.ticket.gap),
        y: LAYOUT.board.y + 8,
        w: LAYOUT.ticket.w,
        h: LAYOUT.ticket.h,
      };
      if (inside(x, y, ticket)) {
        kitchen.selectOrder(state.orders[index].id);
        return;
      }
    }
    for (let index = 0; index < state.grill.length; index += 1) {
      const cx = LAYOUT.grillSlot.x0 + index * (LAYOUT.grillSlot.w + LAYOUT.grillSlot.gap) + LAYOUT.grillSlot.w / 2;
      const cy = LAYOUT.grillSlot.y + LAYOUT.grillSlot.h / 2;
      if ((x - cx) ** 2 + (y - cy) ** 2 <= 52 ** 2) {
        kitchen.grillClick(index);
        return;
      }
    }
    if (inside(x, y, LAYOUT.serveButton)) {
      kitchen.serve();
      return;
    }
    for (let index = 0; index < INGREDIENTS.length; index += 1) {
      const bin = {
        x: LAYOUT.bins.x0 + index * (LAYOUT.bins.w + LAYOUT.bins.gap),
        y: LAYOUT.bins.y,
        w: LAYOUT.bins.w,
        h: LAYOUT.bins.h,
      };
      if (inside(x, y, bin)) {
        kitchen.takeIngredient(INGREDIENTS[index].id);
        return;
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const ticketKey = input.takeTicketKey();
    const binKey = input.takeBinKey();
    for (const click of input.takeClicks()) handleClick(click.x, click.y);
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Bermain.');
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_SERVE) kitchen.serve();
      if (ticketKey >= 1 && ticketKey <= kitchen.state.orders.length) {
        kitchen.selectOrder(kitchen.state.orders[ticketKey - 1].id);
      }
      if (binKey >= 1 && binKey <= INGREDIENTS.length) {
        kitchen.takeIngredient(INGREDIENTS[binKey - 1].id);
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    const events = kitchen.step(STEP);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_SERVED) announce(`Disajikan! Skor ${kitchen.state.score}.`);
    else if (events & EVENT_LOST) announce('Satu pelanggan pergi kecewa.');
    else if (events & EVENT_WRONG) announce(kitchen.state.toast);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(kitchen.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting patience run out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  announce('Dapur Kilat. Tekan Spasi atau klik untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
