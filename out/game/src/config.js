// Dapur Kilat — every tuning number, colour, recipe and layout rect in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift (a full round) lasts this long, in seconds. */
export const SHIFT_SECONDS = 150;

/** How often a new order ticket arrives, in seconds (shrinks as the level rises). */
export const ORDER = { firstAt: 1.5, interval: 9, intervalPerLevel: -0.7, minInterval: 4.5, maxTickets: 3 };

/** Patience of a ticket, in seconds (shrinks as the level rises). */
export const PATIENCE = { base: 48, perLevel: -2.5, min: 28 };

/** A level lasts this many seconds of the shift; spawn rate and patience stop growing at max. */
export const LEVEL = { seconds: 30, max: 5 };

/** Grill: three pans. Each raw item cooks from 0 to 1; the green window is the perfect serve. */
export const GRILL = { slots: 3, doneAt: 0.62, burntAt: 1.0, overcookGrace: 0.12 };

/** Cook time, in seconds, for each grill ingredient. */
export const COOK_TIME = { daging: 6, ayam: 5, telur: 4 };

/** Score: a served dish pays its price plus a patience bonus; a lost ticket costs this. */
export const SCORE = { patienceBonusMax: 12, lostTicket: 5, comboStep: 2 };

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'dapur-kilat.best';

/**
 * The eight ingredients on the counter. `grill` marks the ones that must be cooked first;
 * `key` is the keyboard shortcut; `color`/`dark` paint the icon; `shape` picks its drawing.
 */
export const INGREDIENTS = [
  { id: 'roti', name: 'Roti', key: '1', grill: false, color: '#e8a54b', dark: '#b97a24', shape: 'bun' },
  { id: 'nasi', name: 'Nasi', key: '2', grill: false, color: '#fff3d6', dark: '#d9c48f', shape: 'rice' },
  { id: 'daging', name: 'Daging', key: '3', grill: true, color: '#a34a2e', dark: '#6e2f1c', shape: 'patty' },
  { id: 'ayam', name: 'Ayam', key: '4', grill: true, color: '#d98a3d', dark: '#9c5a1e', shape: 'chicken' },
  { id: 'telur', name: 'Telur', key: '5', grill: true, color: '#ffd94d', dark: '#e0a92c', shape: 'egg' },
  { id: 'selada', name: 'Selada', key: '6', grill: false, color: '#58b368', dark: '#2f7d3d', shape: 'lettuce' },
  { id: 'tomat', name: 'Tomat', key: '7', grill: false, color: '#e0533d', dark: '#a93224', shape: 'tomato' },
  { id: 'keju', name: 'Keju', key: '8', grill: false, color: '#ffc93c', dark: '#d99a12', shape: 'cheese' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map((item) => [item.id, item]));

/**
 * The five recipes. `layers` is the stack bottom to top; a layer that must be grilled is
 * named with a star in the ticket, and the same ingredient can appear twice (top bun).
 */
export const RECIPES = [
  { id: 'burger', name: 'Burger Kilat', price: 30, layers: ['roti', 'daging', 'keju', 'selada', 'tomat', 'roti'] },
  { id: 'nasgor', name: 'Nasi Goreng', price: 26, layers: ['nasi', 'telur', 'ayam', 'tomat'] },
  { id: 'geprek', name: 'Ayam Geprek', price: 24, layers: ['nasi', 'ayam', 'selada', 'tomat'] },
  { id: 'salad', name: 'Salad Segar', price: 20, layers: ['selada', 'tomat', 'telur', 'keju'] },
  { id: 'rotelur', name: 'Roti Keju Telur', price: 22, layers: ['roti', 'keju', 'telur', 'selada', 'roti'] },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((recipe) => [recipe.id, recipe]));

export const CUSTOMERS = [
  'Budi', 'Sari', 'Dewi', 'Agus', 'Rina', 'Joko', 'Maya', 'Putri', 'Andi', 'Lestari', 'Rudi', 'Nina',
];

/** Every clickable region, in logical pixels, shared by the drawer and the click handler. */
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 56 },
  board: { x: 0, y: 64, w: 1280, h: 128 },
  ticket: { w: 300, h: 112, gap: 16, x0: 24, y: 72 },
  shiftPanel: { x: 972, y: 72, w: 284, h: 112 },
  grill: { x: 24, y: 208, w: 300, h: 224 },
  grillSlot: { w: 88, h: 88, gap: 8, x0: 36, y: 292 },
  prep: { x: 340, y: 208, w: 600, h: 224 },
  plate: { x: 560, y: 330, r: 82 },
  serveButton: { x: 800, y: 296, w: 120, h: 72 },
  stats: { x: 956, y: 208, w: 300, h: 224 },
  bins: { x0: 24, y: 452, w: 140, h: 168, gap: 14 },
  footer: { x: 0, y: 636, w: 1280, h: 84 },
};

export const PALETTE = {
  backdrop: '#241708',
  wall: '#f3d9a4',
  wallTile: '#e9c88f',
  counter: '#8a5a2b',
  counterTop: '#a06a35',
  counterEdge: '#6e4218',
  steel: '#c8ccd4',
  steelDark: '#9aa0ab',
  panel: '#fff6e0',
  panelEdge: '#d9b96a',
  ink: '#3a2a18',
  muted: '#8a6f4d',
  tomato: '#e0533d',
  green: '#4caf50',
  greenDark: '#2f7d3d',
  gold: '#ffc93c',
  orange: '#ff7a1a',
  flame: '#ff9d2e',
  smoke: '#b9b3a8',
  danger: '#d63c2a',
  white: '#ffffff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
