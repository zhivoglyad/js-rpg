// ============================================================
// ДАННЫЕ
// ============================================================

// Шаблон игрока — начальные характеристики
const PLAYER_TEMPLATE = {
  name: 'Герой',
  hp: 100,
  maxHp: 100,
  strength: 15,
  defense: 5,
  level: 1,
  xp: 0,
  xpToNext: 100,
  inventory: [],
};

// Шаблоны врагов — каждый враг при спауне создаётся как копия
const ENEMY_TYPES = {
  goblin: {
    name: 'Гоблин',
    hp: 35,
    maxHp: 35,
    strength: 9,
    defense: 2,
    xpReward: 30,
    lootChance: 0.5,
    art: `  ,   ,\n /(o.o)\\\n  ) ∧ (\n /|___|\\`,
  },
  orc: {
    name: 'Орк',
    hp: 70,
    maxHp: 70,
    strength: 16,
    defense: 6,
    xpReward: 60,
    lootChance: 0.6,
    art: `  [◉_◉]\n  |███|\n /|   |\\`,
  },
  dragon: {
    name: 'Дракон',
    hp: 160,
    maxHp: 160,
    strength: 28,
    defense: 12,
    xpReward: 220,
    lootChance: 1.0,
    art: `  /\\ /\\\n (☉\\_/☉)\n  \\___/\n  ╙╨╜`,
  },
  fairy: {
    name: 'Лесная Фея',
    hp: 22,
    maxHp: 22,
    strength: 14,
    defense: 1,
    xpReward: 35,
    lootChance: 0.75,
    art: `  ✦ · ✦\n  (◕‿◕)\n ≋/|\\≋\n  ✦ · ✦`,
  },
  elf: {
    name: 'Эльф-лучник',
    hp: 50,
    maxHp: 50,
    strength: 13,
    defense: 4,
    xpReward: 55,
    lootChance: 0.65,
    art: `  ∧   ∧\n (◡ · ◡)\n  )╞═╡(\n  /   \\`,
  },
};

// Локации: какие враги могут встретиться и с каким шансом
const LOCATIONS = {
  village: {
    name: 'Деревня',
    desc: 'Тихое место. Враги сюда не суются.',
    enemies: [],
    encounterChance: 0,
  },
  forest: {
    name: 'Лес',
    desc: 'Густой лес. Здесь бродят гоблины и орки.',
    enemies: ['goblin', 'orc'],
    encounterChance: 0.7,
  },
  grove: {
    name: 'Зачарованная Роща',
    desc: 'Мерцающий лес фей и эльфов. Красиво и опасно.',
    enemies: ['fairy', 'elf'],
    encounterChance: 0.85,
  },
  dungeon: {
    name: 'Подземелье',
    desc: 'Тёмные катакомбы. Орки и драконы — обычные гости.',
    enemies: ['orc', 'dragon'],
    encounterChance: 0.8,
  },
};

// Возможный лут после победы над врагом
const LOOT_TABLE = [
  { name: 'Зелье здоровья',  type: 'potion', effect: '+40 HP' },
  { name: 'Ржавый меч',      type: 'sword',  effect: '+5 к силе' },
  { name: 'Эльфийский эликсир', type: 'potion', effect: '+40 HP' },
];

// ============================================================
// СОСТОЯНИЕ ИГРЫ
// ============================================================

// Текущий игрок (заполняется в initGame)
let player = {};

// Текущее состояние игры
let gameState = {
  currentLocation: 'village',
  currentEnemy: null,
  isInBattle: false,
  playerDefending: false,
  swordEquipped: false, // временный бафф меча
};

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

function initGame() {
  // Глубокая копия шаблона: создаём нового игрока с чистыми данными
  player = {
    ...PLAYER_TEMPLATE,
    inventory: [], // массив копируем отдельно, чтобы не ссылаться на оригинал
  };

  gameState = {
    currentLocation: 'village',
    currentEnemy: null,
    isInBattle: false,
    playerDefending: false,
    swordEquipped: false,
  };

  clearLog();
  updateUI();
  setBattleButtons(false);
  setMoveButtons(true);
  hideEnemyPanel();
  moveToLocation('village', false); // false = без случайного события при старте
  log('Добро пожаловать в мир RPG! Ты — Герой. Исследуй локации и сражайся с врагами.', 'system');
}

// ============================================================
// ПЕРЕМЕЩЕНИЕ
// ============================================================

function moveToLocation(locationId, triggerEncounter = true) {
  if (gameState.isInBattle) {
    log('Нельзя уйти посреди боя!', 'system');
    return;
  }

  gameState.currentLocation = locationId;
  const location = LOCATIONS[locationId];

  // Убираем бафф меча, если был
  if (gameState.swordEquipped) {
    player.strength -= 5;
    gameState.swordEquipped = false;
  }

  log(`Ты перемещаешься в: ${location.name}.`, 'move');
  updateUI();

  if (!triggerEncounter) return;

  // Случайная встреча с врагом
  const roll = Math.random();
  if (location.enemies.length > 0 && roll < location.encounterChance) {
    const enemyKey = location.enemies[Math.floor(Math.random() * location.enemies.length)];
    log(`Внезапно из темноты появляется ${ENEMY_TYPES[enemyKey].name}!`, 'damage');
    spawnEnemy(enemyKey);
  } else {
    log(`В ${location.name} тихо. Враги не появились.`, 'system');
  }
}

// ============================================================
// БОЙ: СПАУН ВРАГА
// ============================================================

function spawnEnemy(enemyKey) {
  // Копируем шаблон врага, чтобы не изменять оригинал
  const template = ENEMY_TYPES[enemyKey];
  gameState.currentEnemy = { ...template };
  gameState.isInBattle = true;
  gameState.playerDefending = false;

  // ASCII-портрет врага
  document.getElementById('enemy-art').textContent = template.art || '';

  showEnemyPanel();
  setBattleButtons(true);
  setMoveButtons(false);
  updateUI();
}

// ============================================================
// БОЙ: ДЕЙСТВИЯ ИГРОКА
// ============================================================

function attack() {
  if (!gameState.isInBattle) return;

  const enemy = gameState.currentEnemy;

  // Урон игрока = сила - защита врага, минимум 1
  const playerDamage = Math.max(1, player.strength - enemy.defense);
  enemy.hp -= playerDamage;
  log(`Ты атакуешь ${enemy.name} и наносишь ${playerDamage} урона.`, 'damage');

  if (enemy.hp <= 0) {
    onEnemyDeath();
    return;
  }

  // Ответный удар врага
  enemyAttacks();
}

function defend() {
  if (!gameState.isInBattle) return;

  gameState.playerDefending = true;
  log('Ты занимаешь оборонительную стойку. Следующий удар будет ослаблен.', 'system');

  // Враг всё равно атакует, но урон будет снижен внутри enemyAttacks
  enemyAttacks();
}

function enemyAttacks() {
  const enemy = gameState.currentEnemy;

  // Базовый урон врага = сила - защита игрока, минимум 1
  let incomingDamage = Math.max(1, enemy.strength - player.defense);

  // Если игрок защищался, урон вдвое меньше
  if (gameState.playerDefending) {
    incomingDamage = Math.floor(incomingDamage / 2);
    gameState.playerDefending = false;
    log(`${enemy.name} атакует, но твоя защита снижает урон до ${incomingDamage}!`, 'system');
  } else {
    log(`${enemy.name} атакует тебя и наносит ${incomingDamage} урона.`, 'damage');
  }

  player.hp -= incomingDamage;
  flashDamage();

  if (player.hp <= 0) {
    onPlayerDeath();
    return;
  }

  updateUI();
}

// ============================================================
// БОЙ: ИТОГИ
// ============================================================

function onEnemyDeath() {
  const enemy = gameState.currentEnemy;
  log(`${enemy.name} повержен!`, 'level');

  gainXP(enemy.xpReward);
  tryAddLoot(enemy);

  endBattle();
}

function onPlayerDeath() {
  player.hp = 0;
  updateUI();
  log('Ты погиб... Игра окончена. Нажми «Сброс» чтобы начать заново.', 'death');

  endBattle();
  setBattleButtons(false);
  setMoveButtons(false); // полностью блокируем игру до сброса
}

function endBattle() {
  gameState.isInBattle = false;
  gameState.currentEnemy = null;

  hideEnemyPanel();
  setBattleButtons(false);
  setMoveButtons(true);
  updateUI();
}

// ============================================================
// ИНВЕНТАРЬ
// ============================================================

function useItem() {
  if (player.inventory.length === 0) {
    log('Инвентарь пуст.', 'system');
    return;
  }

  // Берём первый предмет из инвентаря
  const item = player.inventory.shift();

  if (item.type === 'potion') {
    const healed = Math.min(40, player.maxHp - player.hp);
    player.hp += healed;
    log(`Ты выпиваешь ${item.name} и восстанавливаешь ${healed} HP.`, 'heal');
  } else if (item.type === 'sword') {
    if (gameState.swordEquipped) {
      // Если меч уже активен — возвращаем в инвентарь
      player.inventory.unshift(item);
      log('Меч уже экипирован.', 'system');
      updateUI();
      return;
    }
    player.strength += 5;
    gameState.swordEquipped = true;
    log(`Ты экипируешь ${item.name}: +5 к силе до конца боя.`, 'loot');
  }

  updateUI();
}

function tryAddLoot(enemy) {
  if (Math.random() < enemy.lootChance) {
    const item = LOOT_TABLE[Math.floor(Math.random() * LOOT_TABLE.length)];
    player.inventory.push({ ...item }); // копия, не ссылка
    log(`Ты подбираешь трофей: ${item.name} (${item.effect}).`, 'loot');
    updateUI();
  }
}

// ============================================================
// ОПЫТ И УРОВЕНЬ
// ============================================================

function gainXP(amount) {
  player.xp += amount;
  log(`Получено ${amount} очков опыта. (${player.xp}/${player.xpToNext})`, 'system');

  if (player.xp >= player.xpToNext) {
    levelUp();
  }
}

function levelUp() {
  player.xp -= player.xpToNext;
  player.level += 1;
  player.xpToNext = Math.floor(player.xpToNext * 1.5); // каждый уровень порог растёт
  player.maxHp += 10;
  player.hp = player.maxHp; // полное восстановление при левелапе
  player.strength += 3;
  player.defense += 1;

  log(`✦ УРОВЕНЬ ${player.level}! +10 HP, +3 сила, +1 защита. Здоровье восстановлено.`, 'level');
  flashLevelUp();
  updateUI();
}

// ============================================================
// ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
// ============================================================

function updateUI() {
  // Статистика персонажа
  document.getElementById('stat-name').textContent  = player.name;
  document.getElementById('stat-hp').textContent    = `${player.hp} / ${player.maxHp}`;
  document.getElementById('stat-str').textContent   = player.strength + (gameState.swordEquipped ? ' (+5)' : '');
  document.getElementById('stat-def').textContent   = player.defense;
  document.getElementById('stat-level').textContent = player.level;
  document.getElementById('stat-xp').textContent    = `${player.xp} / ${player.xpToNext}`;

  const invText = player.inventory.length > 0
    ? player.inventory.map(i => i.name).join(', ')
    : 'пусто';
  document.getElementById('stat-inv').textContent = invText;

  // HP-бар персонажа (ширина в процентах)
  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
  const hpBar = document.getElementById('hp-bar');
  hpBar.style.width = hpPercent + '%';
  hpBar.style.background = hpPercent > 50 ? '#39ff14' : hpPercent > 25 ? '#ffcc00' : '#ff4444';
  hpBar.classList.toggle('hp-bar-fill--critical', hpPercent <= 25);

  // Кнопка "Использовать предмет" — активна только если есть что использовать
  document.getElementById('btn-item').disabled = !gameState.isInBattle || player.inventory.length === 0;

  // Локация
  const loc = LOCATIONS[gameState.currentLocation];
  document.getElementById('location-name').textContent = loc.name;
  document.getElementById('location-desc').textContent = loc.desc;

  // Враг
  if (gameState.currentEnemy) {
    const enemy = gameState.currentEnemy;
    document.getElementById('enemy-name').textContent = enemy.name;
    document.getElementById('enemy-hp').textContent   = `${Math.max(0, enemy.hp)} / ${enemy.maxHp}`;

    const enemyHpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    document.getElementById('enemy-hp-bar').style.width = enemyHpPercent + '%';
  }
}

// ============================================================
// УПРАВЛЕНИЕ UI-ЭЛЕМЕНТАМИ
// ============================================================

function setBattleButtons(active) {
  document.getElementById('btn-attack').disabled = !active;
  document.getElementById('btn-defend').disabled = !active;
  // btn-item управляется отдельно в updateUI (зависит от инвентаря)
  if (!active) document.getElementById('btn-item').disabled = true;
}

function setMoveButtons(active) {
  document.querySelectorAll('.btn--move').forEach(btn => {
    btn.disabled = !active;
  });
}

function showEnemyPanel() {
  document.getElementById('enemy-panel').hidden = false;
}

function hideEnemyPanel() {
  document.getElementById('enemy-panel').hidden = true;
}

// ============================================================
// ЖУРНАЛ СОБЫТИЙ
// ============================================================

function log(message, type = '') {
  const logEl = document.getElementById('log');
  const line = document.createElement('div');
  line.className = 'log-line' + (type ? ` log-line--${type}` : '');
  line.textContent = '> ' + message;
  logEl.appendChild(line);

  // Автопрокрутка вниз
  logEl.scrollTop = logEl.scrollHeight;
}

function clearLog() {
  document.getElementById('log').innerHTML = '';
}

// ============================================================
// ВИЗУАЛЬНЫЕ ЭФФЕКТЫ
// ============================================================

function flashDamage() {
  const el = document.getElementById('damage-flash');
  // Перезапускаем анимацию: убираем класс, форсируем reflow, добавляем снова
  el.classList.remove('active');
  void el.offsetWidth; // (reflow — говорим браузеру: "перечитай геометрию")
  el.classList.add('active');
}

function flashLevelUp() {
  const wrapper = document.querySelector('.game-wrapper');
  wrapper.classList.add('panel--levelup');
  setTimeout(() => wrapper.classList.remove('panel--levelup'), 1000);
}

// ============================================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================

document.getElementById('btn-attack').addEventListener('click', attack);
document.getElementById('btn-defend').addEventListener('click', defend);
document.getElementById('btn-item').addEventListener('click', useItem);
const modalReset = document.getElementById('modal-reset');
document.getElementById('btn-reset').addEventListener('click', () => {
  modalReset.hidden = false;
});
document.getElementById('modal-reset-cancel').addEventListener('click', () => {
  modalReset.hidden = true;
});
document.getElementById('modal-reset-confirm').addEventListener('click', () => {
  modalReset.hidden = true;
  initGame();
});
modalReset.addEventListener('click', e => {
  if (e.target === modalReset) modalReset.hidden = true;
});

// Кнопки перемещения — data-location задаёт id локации
document.querySelectorAll('.btn--move').forEach(btn => {
  btn.addEventListener('click', () => {
    moveToLocation(btn.dataset.location);
  });
});

// ============================================================
// СТАРТ
// ============================================================

initGame();

