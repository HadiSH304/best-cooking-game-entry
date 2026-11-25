// Drawing only: the kitchen's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Every ingredient is drawn from code — domed buns, a fried egg, a patty on the grill
// — so the screenshots show food that looks worth serving. Text that holds a number is
// rebuilt only when the number changes, so a frame allocates nothing.

import { FIELD, FONT, GRILL, INGREDIENTS, INGREDIENT_BY_ID, LAYOUT, PALETTE, SHIFT_SECONDS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TILE = 64;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Skor ');
  const coinsLabel = cachedLabel('Rp');
  const servedLabel = cachedLabel('Tersaji ');
  const comboLabel = cachedLabel('Kombo x');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = `${weight ?? ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ?? ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function clock(seconds) {
    const total = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  /** One ingredient as a compact badge: a coloured disc with the food drawn inside. */
  function drawIngredientIcon(id, cx, cy, s) {
    const item = INGREDIENT_BY_ID[id];
    const r = s / 2;
    context.fillStyle = item.color;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = item.dark;
    context.lineWidth = Math.max(2, s / 16);
    context.stroke();
    context.fillStyle = item.dark;
    if (item.shape === 'bun') {
      context.beginPath();
      context.arc(cx, cy - r * 0.15, r * 0.55, Math.PI, 0);
      context.fill();
      context.fillRect(cx - r * 0.55, cy - r * 0.15, r * 1.1, r * 0.28);
    } else if (item.shape === 'rice') {
      for (let index = 0; index < 5; index += 1) {
        context.beginPath();
        context.arc(cx - r * 0.45 + index * r * 0.22, cy + (index % 2 ? r * 0.1 : -r * 0.15), r * 0.14, 0, Math.PI * 2);
        context.fill();
      }
    } else if (item.shape === 'patty' || item.shape === 'chicken') {
      roundRect(context, cx - r * 0.6, cy - r * 0.3, r * 1.2, r * 0.6, r * 0.25);
      context.fill();
    } else if (item.shape === 'egg') {
      context.fillStyle = '#fff8e6';
      context.beginPath();
      context.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffb52e';
      context.beginPath();
      context.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
      context.fill();
    } else if (item.shape === 'lettuce') {
      context.beginPath();
      for (let index = 0; index <= 6; index += 1) {
        const x = cx - r * 0.6 + (index * r * 1.2) / 6;
        const y = cy + (index % 2 === 0 ? -r * 0.3 : r * 0.3);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.lineTo(cx + r * 0.6, cy + r * 0.35);
      context.lineTo(cx - r * 0.6, cy + r * 0.35);
      context.closePath();
      context.fill();
    } else if (item.shape === 'tomato') {
      context.beginPath();
      context.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ff8a7a';
      context.beginPath();
      context.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
      context.fill();
    } else if (item.shape === 'cheese') {
      context.save();
      context.translate(cx, cy);
      context.rotate(-0.12);
      context.fillRect(-r * 0.55, -r * 0.35, r * 1.1, r * 0.7);
      context.fillStyle = item.color;
      context.beginPath();
      context.arc(-r * 0.2, 0, r * 0.12, 0, Math.PI * 2);
      context.arc(r * 0.25, -r * 0.1, r * 0.1, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  /** One layer of the stack on the plate, drawn as a wide band (bottom to top). */
  function drawLayer(id, cx, y, w) {
    const item = INGREDIENT_BY_ID[id];
    context.fillStyle = item.color;
    context.strokeStyle = item.dark;
    context.lineWidth = 2;
    if (item.shape === 'bun') {
      context.beginPath();
      context.arc(cx, y, w / 2, Math.PI, 0);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = item.dark;
      for (let index = 0; index < 3; index += 1) {
        context.beginPath();
        context.arc(cx - w * 0.22 + index * w * 0.22, y - w * 0.14, 2.5, 0, Math.PI * 2);
        context.fill();
      }
    } else if (item.shape === 'rice') {
      context.beginPath();
      context.ellipse(cx, y, w / 2, w * 0.16, 0, Math.PI, 0);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = item.dark;
      for (let index = 0; index < 6; index += 1) {
        context.beginPath();
        context.arc(cx - w * 0.36 + index * w * 0.14, y - w * 0.08 - (index % 2) * 3, 2.5, 0, Math.PI * 2);
        context.fill();
      }
    } else if (item.shape === 'patty' || item.shape === 'chicken') {
      roundRect(context, cx - w / 2, y - w * 0.09, w, w * 0.18, 8);
      context.fill();
      context.stroke();
    } else if (item.shape === 'egg') {
      context.fillStyle = '#fff8e6';
      context.beginPath();
      context.ellipse(cx, y, w / 2, w * 0.13, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = '#ffb52e';
      context.beginPath();
      context.arc(cx + w * 0.08, y, w * 0.1, 0, Math.PI * 2);
      context.fill();
    } else if (item.shape === 'lettuce') {
      context.beginPath();
      context.moveTo(cx - w / 2, y);
      for (let index = 0; index <= 8; index += 1) {
        context.lineTo(cx - w / 2 + (index * w) / 8, y + (index % 2 === 0 ? -7 : 5));
      }
      context.lineTo(cx + w / 2, y + 8);
      context.lineTo(cx - w / 2, y + 8);
      context.closePath();
      context.fill();
      context.stroke();
    } else if (item.shape === 'tomato') {
      roundRect(context, cx - w / 2, y - w * 0.07, w, w * 0.14, 7);
      context.fill();
      context.stroke();
      context.fillStyle = '#ff8a7a';
      context.beginPath();
      context.arc(cx, y, w * 0.07, 0, Math.PI * 2);
      context.fill();
    } else if (item.shape === 'cheese') {
      context.save();
      context.translate(cx, y);
      context.rotate(-0.04);
      context.fillRect(-w / 2, -w * 0.05, w, w * 0.1);
      context.strokeRect(-w / 2, -w * 0.05, w, w * 0.1);
      context.restore();
    }
  }

  function drawTopBar(state) {
    context.fillStyle = PALETTE.ink;
    context.fillRect(0, 0, FIELD.width, LAYOUT.topBar.h);
    text('DAPUR KILAT', 24, 38, 28, PALETTE.gold, 'left', 'bold ');
    text('Sizzle & Serve', 230, 38, 16, PALETTE.wall, 'left');
    text(scoreLabel(state.score), FIELD.width / 2 - 90, 38, 24, PALETTE.white, 'left', 'bold ');
    text(coinsLabel(state.coins), FIELD.width / 2 + 60, 38, 24, PALETTE.gold, 'left', 'bold ');
    text(servedLabel(state.served), FIELD.width - 150, 38, 22, PALETTE.white, 'right');
    if (state.combo >= 2) text(comboLabel(state.combo), FIELD.width - 24, 38, 22, PALETTE.flame, 'right', 'bold ');
  }

  function drawTicket(order, index, state) {
    const x = LAYOUT.ticket.x0 + index * (LAYOUT.ticket.w + LAYOUT.ticket.gap);
    const y = LAYOUT.board.y + 8;
    const active = order.id === state.activeOrderId;
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y - (active ? 4 : 0), LAYOUT.ticket.w, LAYOUT.ticket.h, 12);
    context.fill();
    context.lineWidth = active ? 4 : 2;
    context.strokeStyle = active ? PALETTE.gold : PALETTE.panelEdge;
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(order.customer, x + 14, y + 26, 18, PALETTE.ink, 'left', 'bold ');
    text(`Rp${order.price}`, x + LAYOUT.ticket.w - 14, y + 26, 18, PALETTE.tomato, 'right', 'bold ');
    text(order.recipe.name, x + 14, y + 50, 20, PALETTE.ink, 'left');
    if (active) text('PIRING AKTIF', x + LAYOUT.ticket.w - 14, y + 50, 12, PALETTE.greenDark, 'right', 'bold ');
    const layers = order.recipe.layers;
    const iconSize = 26;
    const iconY = y + 74;
    for (let i = 0; i < layers.length; i += 1) {
      const cx = x + 22 + i * 34;
      drawIngredientIcon(layers[i], cx, iconY, iconSize);
      if (active && i < state.plate.length) {
        context.fillStyle = PALETTE.green;
        context.beginPath();
        context.arc(cx + 10, iconY - 10, 8, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = PALETTE.white;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(cx + 6, iconY - 10);
        context.lineTo(cx + 10, iconY - 6);
        context.lineTo(cx + 15, iconY - 14);
        context.stroke();
      }
    }
    const share = Math.max(0, order.patience / order.patienceMax);
    const barW = LAYOUT.ticket.w - 28;
    context.fillStyle = '#e5d3a8';
    roundRect(context, x + 14, y + 92, barW, 9, 4);
    context.fill();
    context.fillStyle = share > 0.5 ? PALETTE.green : share > 0.25 ? '#f2a541' : PALETTE.danger;
    roundRect(context, x + 14, y + 92, Math.max(9, barW * share), 9, 4);
    context.fill();
    text(`${Math.ceil(order.patience)} dtk`, x + LAYOUT.ticket.w - 14, y + 88, 12, PALETTE.muted, 'right');
  }

  function drawShiftPanel(state) {
    const panel = LAYOUT.shiftPanel;
    context.fillStyle = PALETTE.panel;
    roundRect(context, panel.x, panel.y, panel.w, panel.h, 12);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    text('SHIFT BERAKHIR DALAM', panel.x + 16, panel.y + 26, 13, PALETTE.muted, 'left', 'bold ');
    const urgent = state.timeLeft <= 30;
    text(clock(state.timeLeft), panel.x + 16, panel.y + 68, 40, urgent ? PALETTE.danger : PALETTE.ink, 'left', 'bold ');
    const barW = panel.w - 32;
    context.fillStyle = '#e5d3a8';
    roundRect(context, panel.x + 16, panel.y + 82, barW, 8, 4);
    context.fill();
    context.fillStyle = urgent ? PALETTE.danger : PALETTE.green;
    roundRect(context, panel.x + 16, panel.y + 82, Math.max(8, barW * (state.timeLeft / SHIFT_SECONDS)), 8, 4);
    context.fill();
    text(`Level ${state.level}`, panel.x + panel.w - 16, panel.y + 26, 16, PALETTE.ink, 'right', 'bold ');
  }

  function drawGrill(state) {
    const panel = LAYOUT.grill;
    context.fillStyle = PALETTE.steelDark;
    roundRect(context, panel.x, panel.y, panel.w, panel.h, 12);
    context.fill();
    text('PANGGANGAN', panel.x + 16, panel.y + 28, 16, PALETTE.white, 'left', 'bold ');
    text('klik saat hijau', panel.x + panel.w - 16, panel.y + 28, 13, '#e8ecf2', 'right');
    for (let index = 0; index < state.grill.length; index += 1) {
      const slot = state.grill[index];
      const cx = LAYOUT.grillSlot.x0 + index * (LAYOUT.grillSlot.w + LAYOUT.grillSlot.gap) + LAYOUT.grillSlot.w / 2;
      const cy = LAYOUT.grillSlot.y + LAYOUT.grillSlot.h / 2;
      context.fillStyle = '#3a3f47';
      context.beginPath();
      context.arc(cx, cy, 42, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#20242a';
      context.lineWidth = 3;
      context.stroke();
      if (slot.ingredient !== null) {
        drawIngredientIcon(slot.ingredient, cx, cy, 56);
        const progress = Math.min(1, slot.progress);
        // Grey ring, the green perfect window, then the orange cook progress over it.
        context.lineWidth = 6;
        context.strokeStyle = '#5a606a';
        context.beginPath();
        context.arc(cx, cy, 50, 0, Math.PI * 2);
        context.stroke();
        context.strokeStyle = PALETTE.green;
        context.lineWidth = 8;
        context.beginPath();
        context.arc(cx, cy, 50, -Math.PI / 2 + Math.PI * 2 * GRILL.doneAt, -Math.PI / 2 + Math.PI * 2 * GRILL.burntAt);
        context.stroke();
        context.strokeStyle = PALETTE.orange;
        context.lineWidth = 6;
        context.beginPath();
        context.arc(cx, cy, 50, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        context.stroke();
        if (slot.burnt) {
          context.fillStyle = 'rgba(120,116,110,0.85)';
          for (let puff = 0; puff < 3; puff += 1) {
            context.beginPath();
            context.arc(cx - 14 + puff * 14, cy - 34 - puff * 6 - ((state.elapsed * 12 + puff * 9) % 10), 8 + puff * 2, 0, Math.PI * 2);
            context.fill();
          }
          text('GOSONG!', cx, cy - 56, 13, PALETTE.danger, 'center', 'bold ');
        } else if (progress >= GRILL.doneAt) {
          text('MATANG!', cx, cy - 56, 13, PALETTE.greenDark, 'center', 'bold ');
        }
      } else {
        context.fillStyle = '#6a707a';
        context.beginPath();
        context.arc(cx, cy, 30, 0, Math.PI * 2);
        context.fill();
        text('+', cx, cy + 9, 28, '#c8ccd4', 'center', 'bold ');
      }
    }
    text('Daging, ayam & telur harus dipanggang dulu.', panel.x + 16, panel.y + panel.h - 14, 13, '#e8ecf2', 'left');
  }

  function drawPrep(state) {
    const panel = LAYOUT.prep;
    context.fillStyle = PALETTE.panel;
    roundRect(context, panel.x, panel.y, panel.w, panel.h, 12);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    const order = state.orders.find((candidate) => candidate.id === state.activeOrderId) ?? null;
    text(order === null ? 'PIRING — pilih pesanan di papan' : `PIRING — ${order.recipe.name}`, panel.x + 16, panel.y + 28, 16, PALETTE.ink, 'left', 'bold ');
    const plate = LAYOUT.plate;
    context.fillStyle = PALETTE.white;
    context.beginPath();
    context.ellipse(plate.x, plate.y + 18, plate.r, plate.r * 0.32, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#d9d2c2';
    context.lineWidth = 3;
    context.stroke();
    if (state.plate.length === 0) {
      context.setLineDash([6, 6]);
      context.strokeStyle = PALETTE.muted;
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(plate.x, plate.y - 6, 62, 20, 0, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      text('Klik bahan sesuai urutan resep', plate.x, plate.y - 34, 14, PALETTE.muted, 'center');
    } else {
      const width = 150;
      let y = plate.y + 6;
      for (let index = 0; index < state.plate.length; index += 1) {
        drawLayer(state.plate[index], plate.x, y, width - index * 4);
        y -= 15;
      }
    }
    const button = LAYOUT.serveButton;
    const complete = order !== null && state.plate.length === order.recipe.layers.length;
    context.fillStyle = complete ? PALETTE.green : '#b9b3a8';
    roundRect(context, button.x, button.y, button.w, button.h, 12);
    context.fill();
    context.fillStyle = PALETTE.white;
    text('SAJIKAN', button.x + button.w / 2, button.y + 32, 22, PALETTE.white, 'center', 'bold ');
    text('(S)', button.x + button.w / 2, button.y + 56, 15, PALETTE.white, 'center');
    if (complete) text('Siap diantar!', button.x + button.w / 2, button.y + button.h + 22, 14, PALETTE.greenDark, 'center', 'bold ');
  }

  function drawStats(state) {
    const panel = LAYOUT.stats;
    context.fillStyle = PALETTE.panel;
    roundRect(context, panel.x, panel.y, panel.w, panel.h, 12);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    text('KASIR', panel.x + 16, panel.y + 28, 16, PALETTE.ink, 'left', 'bold ');
    text(coinsLabel(state.coins), panel.x + 16, panel.y + 72, 36, PALETTE.tomato, 'left', 'bold ');
    text('koin hari ini', panel.x + 16, panel.y + 96, 14, PALETTE.muted, 'left');
    const rows = [
      ['Pesanan tersaji', String(state.served)],
      ['Pesanan hilang', String(state.lost)],
      ['Kombo terbaik', `x${state.bestCombo}`],
      ['Skor', String(state.score)],
    ];
    for (let index = 0; index < rows.length; index += 1) {
      const y = panel.y + 128 + index * 24;
      text(rows[index][0], panel.x + 16, y, 16, PALETTE.ink, 'left');
      text(rows[index][1], panel.x + panel.w - 16, y, 16, PALETTE.ink, 'right', 'bold ');
    }
  }

  function drawBins(state) {
    text('BAHAN DI MEJA — klik, atau tekan 1–8', LAYOUT.bins.x0, LAYOUT.bins.y - 8, 16, PALETTE.ink, 'left', 'bold ');
    for (let index = 0; index < INGREDIENTS.length; index += 1) {
      const item = INGREDIENTS[index];
      const x = LAYOUT.bins.x0 + index * (LAYOUT.bins.w + LAYOUT.bins.gap);
      const y = LAYOUT.bins.y;
      context.fillStyle = '#fbf3dd';
      roundRect(context, x, y, LAYOUT.bins.w, LAYOUT.bins.h, 12);
      context.fill();
      context.strokeStyle = '#d9b96a';
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = PALETTE.ink;
      context.beginPath();
      context.arc(x + 20, y + 20, 13, 0, Math.PI * 2);
      context.fill();
      text(item.key, x + 20, y + 25, 15, PALETTE.white, 'center', 'bold ');
      drawIngredientIcon(item.id, x + LAYOUT.bins.w / 2, y + 68, 64);
      text(item.name, x + LAYOUT.bins.w / 2, y + 128, 18, PALETTE.ink, 'center', 'bold ');
      if (item.grill) text('PANGGANG DULU', x + LAYOUT.bins.w / 2, y + 150, 12, PALETTE.tomato, 'center', 'bold ');
      else text('langsung ke piring', x + LAYOUT.bins.w / 2, y + 150, 12, PALETTE.muted, 'center');
    }
  }

  function drawKitchen(state) {
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.wallTile;
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < FIELD.width / TILE; col += 1) {
        if ((row + col) % 2 === 0) context.fillRect(col * TILE + (row % 2) * TILE / 2, LAYOUT.topBar.h + row * TILE, TILE, TILE);
      }
    }
    drawTopBar(state);
    for (let index = 0; index < state.orders.length; index += 1) drawTicket(state.orders[index], index, state);
    if (state.orders.length === 0) {
      context.fillStyle = PALETTE.panel;
      roundRect(context, LAYOUT.ticket.x0, LAYOUT.board.y + 8, LAYOUT.ticket.w, LAYOUT.ticket.h, 12);
      context.fill();
      text('Menunggu pesanan pertama…', LAYOUT.ticket.x0 + 20, LAYOUT.board.y + 66, 16, PALETTE.muted, 'left');
    }
    drawShiftPanel(state);
    drawGrill(state);
    drawPrep(state);
    drawStats(state);
    drawBins(state);
    context.textBaseline = 'alphabetic';
    if (state.toast !== '' && state.elapsed < state.toastUntil) {
      context.font = `16px ${FONT}`;
      context.fillStyle = 'rgba(36,23,8,0.85)';
      const w = Math.min(900, context.measureText(state.toast).width + 40);
      roundRect(context, (FIELD.width - w) / 2, LAYOUT.footer.y + 8, w, 34, 17);
      context.fill();
      text(state.toast, FIELD.width / 2, LAYOUT.footer.y + 31, 16, PALETTE.white, 'center');
    }
    text('1–8 bahan · Q/W/E pesanan · S sajikan · P jeda · klik semua tombol', FIELD.width / 2, LAYOUT.footer.y + 66, 14, PALETTE.muted, 'center');
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 34 + 70;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(36,23,8,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 4;
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 74, 46, accent ?? PALETTE.tomato, 'center', 'bold ');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 132 + index * 34, 20, PALETTE.ink, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 36, 22, PALETTE.greenDark, 'center', 'bold ');
  }

  function grade(score) {
    if (score >= 400) return 'S';
    if (score >= 300) return 'A';
    if (score >= 180) return 'B';
    return 'C';
  }

  /** Paint one frame: the kitchen, then a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawKitchen(state);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'DAPUR KILAT',
        [
          'Sajikan pesanan sebelum pelanggan kehabisan sabar.',
          'Klik bahan di meja — daging, ayam & telur dipanggang dulu.',
          'Susun lapisan sesuai resep, lalu SAJIKAN sebelum waktunya habis.',
          `Skor terbaik: ${best}`,
        ],
        'Tekan Spasi atau klik untuk mulai',
      );
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Jeda', ['Panggangan menunggu — pesanan tidak ke mana-mana.'], 'Tekan P untuk lanjut', PALETTE.ink);
    } else if (screen === SCREEN_OVER) {
      drawPanel(
        `Shift Selesai — Nilai ${grade(state.score)}`,
        [
          `Skor ${state.score} · Koin Rp${state.coins}`,
          `Pesanan tersaji: ${state.served} · hilang: ${state.lost}`,
          `Kombo terbaik: x${state.bestCombo}`,
          `Skor terbaik: ${best}`,
        ],
        'Tekan Spasi atau klik untuk main lagi',
        PALETTE.greenDark,
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
