// The screenshot scenes behind ?shot=cover|orders|serve|end. Each one plays the real rules
// forward from a fresh kitchen for a fixed stretch, steered by a simple autopilot (take the
// next layer the active recipe wants, grill what must be grilled, serve a finished plate), so
// every frame is what a real shift looks like and the same seed always gives the same frame.
import { GRILL, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './draw.js';

const SAMPLE = STEP;

/** One autopilot decision per step: work the active order toward a served plate. */
function autopilot(kitchen, serveEnabled) {
  const state = kitchen.state;
  if (state.orders.length === 0) return;
  if (state.activeOrderId === 0) kitchen.selectOrder(state.orders[0].id);
  const needed = kitchen.nextNeeded();
  if (needed === null) {
    if (serveEnabled) kitchen.serve();
    return;
  }
  const item = state.grill.findIndex((slot) => slot.ingredient === needed);
  if (item !== -1) {
    const slot = state.grill[item];
    if (slot.burnt) kitchen.grillClick(item);
    else if (slot.progress >= GRILL.doneAt) kitchen.grillClick(item);
    return;
  }
  const cooking = state.grill.some((slot) => slot.ingredient !== null && !slot.burnt);
  const grillItem = ['daging', 'ayam', 'telur'].includes(needed);
  if (grillItem) {
    if (state.grill.some((slot) => slot.ingredient === null)) kitchen.takeIngredient(needed);
    return;
  }
  if (cooking) return;
  kitchen.takeIngredient(needed);
}

/** Step the kitchen forward `seconds` of play, one autopilot decision per fixed step. */
function playForward(kitchen, seconds, serveEnabled = true) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let index = 0; index < steps; index += 1) {
    autopilot(kitchen, serveEnabled);
    if (kitchen.step(SAMPLE) & 4) break;
  }
}

/** True when at least one pan holds an item that is cooking (not burnt). */
function somethingCooking(kitchen) {
  return kitchen.state.grill.some((slot) => slot.ingredient !== null && !slot.burnt);
}

/** Fill the board with three tickets at once, so a staged frame always shows a full board. */
function fillBoard(kitchen) {
  while (kitchen.state.orders.length < 3) kitchen.spawnOrder();
  kitchen.selectOrder(kitchen.state.orders[0].id);
}

/**
 * Set `kitchen` to the named scene and return the screen to draw over it and the best score.
 * cover: mid-rush with two dishes served, a plate half-built and a patty on the grill.
 * orders: a fresh board of three tickets with the first plate started.
 * serve: a finished plate glowing on the SERVE button, timer still running.
 * end: a whole shift played out, results panel up. Any other name is the title screen.
 */
export function stageShot(name, kitchen) {
  kitchen.reset();
  if (name === 'cover') {
    fillBoard(kitchen);
    let guard = 0;
    while (guard < 100) {
      playForward(kitchen, 5);
      guard += 5;
      const state = kitchen.state;
      if (state.served >= 1 && state.plate.length >= 2 && somethingCooking(kitchen)) break;
      if (state.timeLeft <= 0) break;
    }
    // Pose the frame: a plate at least two layers high and a patty on the grill.
    if (kitchen.state.plate.length < 2) playForward(kitchen, 10, false);
    if (!somethingCooking(kitchen) && kitchen.state.grill.some((slot) => slot.ingredient === null)) {
      kitchen.takeIngredient('daging');
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'orders') {
    fillBoard(kitchen);
    playForward(kitchen, 9, false);
    if (!somethingCooking(kitchen) && kitchen.state.grill.some((slot) => slot.ingredient === null)) {
      kitchen.takeIngredient('daging');
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'serve') {
    fillBoard(kitchen);
    let guard = 0;
    while (guard < 120) {
      playForward(kitchen, 2, false);
      guard += 2;
      if (kitchen.nextNeeded() === null && kitchen.state.plate.length > 0) break;
      if (kitchen.state.timeLeft <= 0) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    playForward(kitchen, 400);
    return { screen: SCREEN_OVER, best: kitchen.state.score };
  }
  kitchen.step(5);
  return { screen: SCREEN_TITLE, best: 0 };
}
