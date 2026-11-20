'use strict';

const storageKey = 'english-flashcards-v1';
const form = document.getElementById('add-form');
const wordInput = document.getElementById('word');
const translationInput = document.getElementById('translation');
const flashcard = document.getElementById('flashcard');
const knownButton = document.getElementById('known');
const unknownButton = document.getElementById('unknown');
const list = document.getElementById('word-list');
const storageMessage = document.getElementById('storage-message');
let cards = [];
let activeId = null;
let flipped = false;

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (!Array.isArray(saved)) throw new Error('Invalid cards');
  const ids = new Set();
  cards = saved.filter(card => {
    if (!card || typeof card.id !== 'string' || ids.has(card.id) ||
        typeof card.word !== 'string' || !card.word.trim() ||
        typeof card.translation !== 'string' || !card.translation.trim()) return false;
    ids.add(card.id);
    return true;
  }).map(card => ({ id: card.id, word: card.word.trim(), translation: card.translation.trim(), known: card.known === true }));
} catch {
  storageMessage.textContent = 'Не удалось загрузить карточки. Проверьте доступ к хранилищу браузера.';
}
activeId = cards[0]?.id ?? null;

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(cards));
    storageMessage.textContent = '';
  } catch {
    storageMessage.textContent = 'Не удалось сохранить карточки. После закрытия страницы изменения могут потеряться.';
  }
}

function render() {
  const active = cards.find(card => card.id === activeId);
  flashcard.disabled = knownButton.disabled = unknownButton.disabled = !active;
  document.getElementById('card-side').textContent = active ? (flipped ? 'Перевод' : 'Слово или фраза') : 'Пока нет карточек';
  document.getElementById('card-text').textContent = active ? (flipped ? active.translation : active.word) : 'Добавьте первое слово';
  document.getElementById('card-text').lang = active && !flipped ? 'en' : 'ru';
  document.getElementById('flip-hint').hidden = !active;
  knownButton.setAttribute('aria-pressed', String(Boolean(active?.known)));
  unknownButton.setAttribute('aria-pressed', String(Boolean(active && !active.known)));
  document.getElementById('learned-count').textContent = `Выучено: ${cards.filter(card => card.known).length}`;
  document.getElementById('empty-list').hidden = cards.length > 0;
  list.replaceChildren();
  for (const card of cards) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'word-item';
    button.setAttribute('aria-current', String(card.id === activeId));
    const label = document.createElement('span');
    label.className = 'word-label';
    label.lang = 'en';
    label.textContent = card.word;
    const status = document.createElement('span');
    status.className = 'word-status';
    status.textContent = card.known ? 'Знаю' : 'Не знаю';
    button.append(label, status);
    button.addEventListener('click', () => {
      activeId = card.id;
      flipped = false;
      render();
      flashcard.focus();
    });
    item.append(button);
    list.append(item);
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  let firstInvalid = null;
  for (const [input, errorId, message] of [
    [wordInput, 'word-error', 'Введите слово или фразу.'],
    [translationInput, 'translation-error', 'Введите перевод.']
  ]) {
    const invalid = !input.value.trim();
    input.setAttribute('aria-invalid', String(invalid));
    document.getElementById(errorId).textContent = invalid ? message : '';
    if (invalid && !firstInvalid) firstInvalid = input;
  }
  if (firstInvalid) { firstInvalid.focus(); return; }
  const card = { id: crypto.randomUUID(), word: wordInput.value.trim(), translation: translationInput.value.trim(), known: false };
  cards.unshift(card);
  activeId = card.id;
  flipped = false;
  save();
  form.reset();
  render();
  wordInput.focus();
});

flashcard.addEventListener('click', () => { flipped = !flipped; render(); });
function mark(known) {
  const active = cards.find(card => card.id === activeId);
  if (!active) return;
  active.known = known;
  save();
  render();
}
knownButton.addEventListener('click', () => mark(true));
unknownButton.addEventListener('click', () => mark(false));
render();
