// Dapur Kilat's rules and state, with no drawing and no browser in it: order tickets arrive
// on the board, ingredients are taken from the counter, grill items cook on the pans, layers
// stack on the plate in recipe order, and a finished plate is served before the customer's
// patience runs out. step() advances one fixed step and returns what happened as bit flags,
// so the caller can react without the world knowing about screens or sound.

import {
  COOK_TIME, CUSTOMERS, GRILL, INGREDIENT_BY_ID, LEVEL, ORDER, PATIENCE,
  RECIPES, SCORE, SHIFT_SECONDS,
} from './config.js';
import { pick } from './random.js';

export const EVENT_SERVED = 1;
export const EVENT_LOST = 2;
export const EVENT_OVER = 4;
export const EVENT_WRONG = 8;
export const EVENT_COOKED = 16;
export const EVENT_BURNT = 32;
export const EVENT_GRILL_FULL = 64;

let nextOrderId = 1;

function orderInterval(level) {
  return Math.max(ORDER.minInterval, ORDER.interval + ORDER.intervalPerLevel * (level - 1));
}

function patienceFor(level) {
  return Math.max(PATIENCE.min, PATIENCE.base + PATIENCE.perLevel * (level - 1));
}

export function createKitchen(random) {
  const state = {
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    level: 1,
    score: 0,
    coins: 0,
    served: 0,
    lost: 0,
    combo: 0,
    bestCombo: 0,
    orders: [],
    grill: [],
    plate: [],
    activeOrderId: 0,
    orderTimer: ORDER.firstAt,
    toast: '',
    toastUntil: 0,
    lastServedName: '',
    lastServeCoins: 0,
  };
  for (let index = 0; index < GRILL.slots; index += 1) {
    state.grill.push({ ingredient: null, progress: 0, announced: false, burnt: false });
  }

  function reset() {
    state.timeLeft = SHIFT_SECONDS;
    state.elapsed = 0;
    state.level = 1;
    state.score = 0;
    state.coins = 0;
    state.served = 0;
    state.lost = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.orders = [];
    state.plate = [];
    state.activeOrderId = 0;
    state.orderTimer = ORDER.firstAt;
    state.toast = '';
    state.toastUntil = 0;
    state.lastServedName = '';
    state.lastServeCoins = 0;
    for (const slot of state.grill) {
      slot.ingredient = null;
      slot.progress = 0;
      slot.announced = false;
      slot.burnt = false;
    }
  }

  function activeOrder() {
    return state.orders.find((order) => order.id === state.activeOrderId) ?? null;
  }

  /** The next layer the active order still needs, or null when the plate is complete. */
  function nextNeeded() {
    const order = activeOrder();
    if (order === null) return null;
    return order.recipe.layers[state.plate.length] ?? null;
  }

  function say(message) {
    state.toast = message;
    state.toastUntil = state.elapsed + 2.4;
  }

  function spawnOrder() {
    const recipe = pick(random, RECIPES);
    const patience = patienceFor(state.level);
    const order = {
      id: nextOrderId,
      recipe,
      customer: pick(random, CUSTOMERS),
      patience,
      patienceMax: patience,
      price: recipe.price,
      born: state.elapsed,
    };
    nextOrderId += 1;
    state.orders.push(order);
    if (state.activeOrderId === 0) state.activeOrderId = order.id;
    return order;
  }

  /** Click (or press the key for) an ingredient bin on the counter. */
  function takeIngredient(id) {
    const ingredient = INGREDIENT_BY_ID[id];
    if (ingredient === undefined) return 0;
    if (ingredient.grill) {
      const slot = state.grill.find((candidate) => candidate.ingredient === null);
      if (slot === undefined) {
        say('Panggangan penuh! Ambil dulu yang sudah matang.');
        return EVENT_GRILL_FULL;
      }
      slot.ingredient = id;
      slot.progress = 0;
      slot.announced = false;
      slot.burnt = false;
      return 0;
    }
    return addToPlate(id);
  }

  /** Put a ready ingredient on the plate, but only when it is the next layer the recipe wants. */
  function addToPlate(id) {
    const needed = nextNeeded();
    if (needed === null) {
      say('Pilih dulu pesanan di papan order!');
      return EVENT_WRONG;
    }
    if (needed !== id) {
      say(`Bukan gilirannya — ${INGREDIENT_BY_ID[needed].name} dulu, baru ${INGREDIENT_BY_ID[id].name}.`);
      return EVENT_WRONG;
    }
    state.plate.push(id);
    return 0;
  }

  /** Click a grill pan: take a cooked item onto the plate, or throw a burnt one away. */
  function grillClick(slotIndex) {
    const slot = state.grill[slotIndex];
    if (slot === undefined || slot.ingredient === null) return 0;
    if (slot.burnt) {
      slot.ingredient = null;
      slot.progress = 0;
      slot.burnt = false;
      say('Gosong dibuang — awasi apinya!');
      return 0;
    }
    if (slot.progress < GRILL.doneAt) {
      say(`${INGREDIENT_BY_ID[slot.ingredient].name} masih mentah — tunggu sampai hijau.`);
      return EVENT_WRONG;
    }
    const id = slot.ingredient;
    const result = addToPlate(id);
    if (result === 0) {
      slot.ingredient = null;
      slot.progress = 0;
      slot.announced = false;
    }
    return result;
  }

  /** Pick an order ticket on the board: its plate becomes the one being built. */
  function selectOrder(id) {
    if (state.orders.some((order) => order.id === id)) {
      state.activeOrderId = id;
      state.plate = [];
    }
  }

  /** Serve the finished plate: coins, score, combo; the ticket leaves the board. */
  function serve() {
    const order = activeOrder();
    if (order === null) return 0;
    if (state.plate.length !== order.recipe.layers.length) {
      say('Piring belum lengkap — lengkapi dulu semua lapisan!');
      return EVENT_WRONG;
    }
    const patienceShare = Math.max(0, order.patience / order.patienceMax);
    const bonus = Math.round(SCORE.patienceBonusMax * patienceShare);
    const comboBonus = Math.min(10, state.combo * SCORE.comboStep);
    const earned = order.price + bonus + comboBonus;
    state.coins += earned;
    state.score += earned;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.lastServedName = order.recipe.name;
    state.lastServeCoins = earned;
    state.orders = state.orders.filter((candidate) => candidate.id !== order.id);
    state.plate = [];
    state.activeOrderId = state.orders.length > 0 ? state.orders[0].id : 0;
    say(`Disajikan! ${order.recipe.name} +Rp${earned}${state.combo > 1 ? ` (kombo x${state.combo})` : ''}`);
    return EVENT_SERVED;
  }

  function step(dt) {
    let events = 0;
    state.elapsed += dt;
    state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));

    if (state.timeLeft > 0) {
      state.orderTimer -= dt;
      if (state.orderTimer <= 0 && state.orders.length < ORDER.maxTickets) {
        spawnOrder();
        state.orderTimer += orderInterval(state.level);
      }
    }

    for (const order of state.orders) order.patience -= dt;
    const expired = state.orders.filter((order) => order.patience <= 0);
    if (expired.length > 0) {
      for (const order of expired) {
        state.orders = state.orders.filter((candidate) => candidate.id !== order.id);
        state.lost += 1;
        state.combo = 0;
        state.score = Math.max(0, state.score - SCORE.lostTicket);
        say(`${order.customer} pergi kecewa — ${order.recipe.name} tak kunjung datang.`);
      }
      if (state.activeOrderId !== 0 && !state.orders.some((order) => order.id === state.activeOrderId)) {
        state.activeOrderId = state.orders.length > 0 ? state.orders[0].id : 0;
        state.plate = [];
      }
      events |= EVENT_LOST;
    }

    for (const slot of state.grill) {
      if (slot.ingredient === null) continue;
      slot.progress += dt / COOK_TIME[slot.ingredient];
      if (!slot.announced && slot.progress >= GRILL.doneAt && slot.progress < GRILL.burntAt) {
        slot.announced = true;
        events |= EVENT_COOKED;
      }
      if (!slot.burnt && slot.progress >= GRILL.burntAt + GRILL.overcookGrace) {
        slot.burnt = true;
        events |= EVENT_BURNT;
        say(`${INGREDIENT_BY_ID[slot.ingredient].name} gosong! Klik untuk membuangnya.`);
      }
    }

    if (state.timeLeft <= 0) events |= EVENT_OVER;
    return events;
  }

  reset();
  return { state, reset, step, spawnOrder, takeIngredient, addToPlate, grillClick, selectOrder, serve, activeOrder, nextNeeded };
}
