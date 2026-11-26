'use strict';

const storageKey = 'english-flashcards-v1';
const form = document.getElementById('add-form');
const wordInput = document.getElementById('word');
const translationInput = document.getElementById('translation');
const hintInput = document.getElementById('hint');
const hintToggle = document.getElementById('hint-toggle');
const cardHint = document.getElementById('card-hint');
const flashcard = document.getElementById('flashcard');
const knownButton = document.getElementById('known');
const unknownButton = document.getElementById('unknown');
const list = document.getElementById('word-list');
const storageMessage = document.getElementById('storage-message');
const categoryForm = document.getElementById('category-form');
const categoryName = document.getElementById('category-name');
const newCategory = document.getElementById('new-category');
const activeCategory = document.getElementById('active-category');
const reviewMode = document.getElementById('review-mode');
const editPanel = document.getElementById('edit-panel');
const editForm = document.getElementById('edit-form');
const editWord = document.getElementById('edit-word');
const editTranslation = document.getElementById('edit-translation');
const editHint = document.getElementById('edit-hint');
const editCategory = document.getElementById('edit-category');
let editingId = null;
reviewMode.value = 'all';
let onlyUnknown = false;
const defaultCategory = { id: 'uncategorized', name: 'Без категории', goal: null };
let categories = [defaultCategory];
let cards = [];
let activeId = null;
let flipped = false;
let hintOpen = false;

function triggerFlipAnimation() {
  flashcard.classList.remove('is-flipping');
  void flashcard.offsetWidth;
  flashcard.classList.add('is-flipping');
}

flashcard.addEventListener('animationend', () => {
  flashcard.classList.remove('is-flipping');
});

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const savedCards = Array.isArray(saved) ? saved : saved?.cards;
  if (!Array.isArray(savedCards)) throw new Error('Invalid cards');
  const categoryIds = new Set([defaultCategory.id]);
  const categoryNames = new Set([defaultCategory.name.toLocaleLowerCase('ru')]);
  if (Array.isArray(saved.categories)) {
    for (const category of saved.categories) {
      if (category?.id === defaultCategory.id) {
        defaultCategory.goal = Number.isSafeInteger(category.goal) && category.goal > 0 ? category.goal : null;
        continue;
      }
      if (!category || typeof category.id !== 'string' || !category.id || categoryIds.has(category.id) ||
          typeof category.name !== 'string' || !category.name.trim()) continue;
      const name = category.name.trim();
      if (categoryNames.has(name.toLocaleLowerCase('ru'))) continue;
      categories.push({ id: category.id, name, goal: Number.isSafeInteger(category.goal) && category.goal > 0 ? category.goal : null });
      categoryIds.add(category.id);
      categoryNames.add(name.toLocaleLowerCase('ru'));
    }
  }
  const ids = new Set();
  cards = savedCards.filter(card => {
    if (!card || typeof card.id !== 'string' || ids.has(card.id) ||
        typeof card.word !== 'string' || !card.word.trim() ||
        typeof card.translation !== 'string' || !card.translation.trim()) return false;
    ids.add(card.id);
    return true;
  }).map(card => ({ id: card.id, word: card.word.trim(), translation: card.translation.trim(), known: card.known === true,
    categoryId: categoryIds.has(card.categoryId) ? card.categoryId : defaultCategory.id,
    hint: typeof card.hint === 'string' ? card.hint.trim() : '' }));
} catch {
  storageMessage.textContent = 'Не удалось загрузить карточки. Проверьте доступ к хранилищу браузера.';
}
activeId = cards[0]?.id ?? null;

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ cards, categories }));
    storageMessage.textContent = '';
  } catch {
    storageMessage.textContent = 'Не удалось сохранить карточки. После закрытия страницы изменения могут потеряться.';
  }
}

function render() {
  const visibleCards = onlyUnknown ? cards.filter(card => !card.known) : cards;
  if (!visibleCards.some(card => card.id === activeId)) {
    activeId = visibleCards[0]?.id ?? null;
    flipped = false;
    hintOpen = false;
  }
  const active = cards.find(card => card.id === activeId);
  if (!active?.hint) hintOpen = false;
  hintToggle.disabled = !active?.hint;
  hintToggle.setAttribute('aria-expanded', String(hintOpen));
  cardHint.hidden = !hintOpen;
  cardHint.textContent = active?.hint ?? '';
  const reviewFinished = onlyUnknown && cards.length > 0 && visibleCards.length === 0;
  document.getElementById('review-message').hidden = !reviewFinished;
  flashcard.hidden = reviewFinished;
  const knownCount = cards.filter(card => card.known).length;
  const percent = cards.length ? Math.round(knownCount / cards.length * 100) : 0;
  document.getElementById('overall-count').textContent = `Знаю ${knownCount} из ${cards.length} · ${percent}%`;
  document.getElementById('overall-progress').value = percent;
  const selectedCategory = newCategory.value;
  for (const select of [newCategory, activeCategory]) {
    select.replaceChildren();
    for (const category of categories) {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      select.append(option);
    }
  }
  newCategory.value = categories.some(category => category.id === selectedCategory) ? selectedCategory : defaultCategory.id;
  activeCategory.value = active?.categoryId ?? defaultCategory.id;
  activeCategory.disabled = !active;
  const categoryList = document.getElementById('category-list');
  categoryList.replaceChildren();
  for (const category of categories) {
    const item = document.createElement('li');
    const heading = document.createElement('h3');
    heading.textContent = category.name;
    const categoryCards = cards.filter(card => card.categoryId === category.id);
    const known = categoryCards.filter(card => card.known).length;
    const stats = document.createElement('p');
    stats.className = 'category-stats';
    stats.setAttribute('role', 'status');
    stats.textContent = `Добавлено: ${categoryCards.length} · Знаю: ${known} · ` +
      (category.goal ? `Цель: ${category.goal} · До цели: ${Math.max(category.goal - known, 0)}` : 'Цель не задана');
    const goalForm = document.createElement('form');
    goalForm.className = 'goal-form';
    goalForm.noValidate = true;
    const field = document.createElement('div');
    const label = document.createElement('label');
    label.htmlFor = `goal-${category.id}`;
    label.textContent = 'Цель слов';
    const input = document.createElement('input');
    input.id = label.htmlFor;
    input.type = 'text';
    input.inputMode = 'numeric';
    input.value = category.goal ? String(category.goal) : '';
    const hint = document.createElement('p');
    hint.id = `goal-hint-${category.id}`;
    hint.className = 'goal-hint';
    hint.textContent = 'Пустое поле — без цели.';
    const error = document.createElement('p');
    error.id = `goal-error-${category.id}`;
    error.className = 'error';
    error.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-describedby', `${hint.id} ${error.id}`);
    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = 'Сохранить цель';
    goalForm.addEventListener('submit', event => {
      event.preventDefault();
      const value = input.value.trim();
      const goal = value === '' ? null : Number(value);
      if (value !== '' && (!/^\d+$/.test(value) || !Number.isSafeInteger(goal) || goal <= 0)) {
        error.textContent = 'Введите целое число больше нуля или очистите поле.';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      category.goal = goal;
      save();
      render();
      document.getElementById(`goal-${category.id}`).focus();
    });
    field.append(label, input, hint, error);
    goalForm.append(field, button);
    item.append(heading, stats, goalForm);
    if (category.goal && (categoryCards.length < category.goal || known >= category.goal)) {
      const message = document.createElement('p');
      const reached = known >= category.goal;
      message.className = reached ? 'category-message goal-reached' : 'category-message goal-shortage';
      message.setAttribute('role', 'status');
      message.textContent = reached ? 'Цель достигнута' : `Добавьте ещё ${category.goal - categoryCards.length}`;
      item.append(message);
    }
    categoryList.append(item);
  }
  flashcard.disabled = knownButton.disabled = unknownButton.disabled = !active;
  flashcard.classList.toggle('is-back', Boolean(active && flipped));
  document.getElementById('card-side').textContent = active ? (flipped ? 'Перевод' : 'Слово или фраза') : 'Пока нет карточек';
  document.getElementById('card-text').textContent = active ? (flipped ? active.translation : active.word) : 'Добавьте первое слово';
  document.getElementById('card-text').lang = active && !flipped ? 'en' : 'ru';
  document.getElementById('flip-hint').hidden = !active;
  knownButton.setAttribute('aria-pressed', String(Boolean(active?.known)));
  unknownButton.setAttribute('aria-pressed', String(Boolean(active && !active.known)));
  document.getElementById('learned-count').textContent = `Выучено: ${knownCount}`;
  document.getElementById('empty-list').hidden = cards.length > 0;
  list.replaceChildren();
  for (const card of visibleCards) {
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
      hintOpen = false;
      render();
      flashcard.focus();
    });
    item.append(button);
    const actions = document.createElement('div');
    actions.className = 'word-actions';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.id = `edit-button-${card.id}`;
    editButton.textContent = 'Изменить';
    editButton.setAttribute('aria-label', `Изменить: ${card.word}`);
    editButton.addEventListener('click', () => openEditor(card));
    actions.append(editButton);
    item.append(actions);
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
  const card = { id: crypto.randomUUID(), word: wordInput.value.trim(), translation: translationInput.value.trim(), known: false, categoryId: newCategory.value, hint: hintInput.value.trim() };
  cards.unshift(card);
  activeId = card.id;
  flipped = false;
  hintOpen = false;
  save();
  form.reset();
  render();
  wordInput.focus();
});
function openEditor(card) {
  editingId = card.id;
  editWord.value = card.word;
  editTranslation.value = card.translation;
  editHint.value = card.hint;
  editCategory.replaceChildren();
  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    editCategory.append(option);
  }
  editCategory.value = card.categoryId;
  for (const [input, errorId] of [[editWord, 'edit-word-error'], [editTranslation, 'edit-translation-error']]) {
    input.setAttribute('aria-invalid', 'false');
    document.getElementById(errorId).textContent = '';
  }
  editPanel.hidden = false;
  editWord.focus();
}

function closeEditor() {
  const button = document.getElementById(`edit-button-${editingId}`);
  editingId = null;
  editPanel.hidden = true;
  editForm.reset();
  if (button) button.focus();
  else reviewMode.focus();
}

editForm.addEventListener('submit', event => {
  event.preventDefault();
  const card = cards.find(card => card.id === editingId);
  if (!card) { closeEditor(); return; }
  let firstInvalid = null;
  for (const [input, errorId, message] of [
    [editWord, 'edit-word-error', 'Введите слово или фразу.'],
    [editTranslation, 'edit-translation-error', 'Введите перевод.']
  ]) {
    const invalid = !input.value.trim();
    input.setAttribute('aria-invalid', String(invalid));
    document.getElementById(errorId).textContent = invalid ? message : '';
    if (invalid && !firstInvalid) firstInvalid = input;
  }
  if (firstInvalid) { firstInvalid.focus(); return; }
  if (!categories.some(category => category.id === editCategory.value)) return;
  card.word = editWord.value.trim();
  card.translation = editTranslation.value.trim();
  card.hint = editHint.value.trim();
  card.categoryId = editCategory.value;
  flipped = false;
  hintOpen = false;
  save();
  render();
  closeEditor();
});
document.getElementById('edit-cancel').addEventListener('click', closeEditor);

categoryForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = categoryName.value.trim();
  const duplicate = categories.some(category => category.name.toLocaleLowerCase('ru') === name.toLocaleLowerCase('ru'));
  const error = !name ? 'Введите название категории.' : duplicate ? 'Такая категория уже есть.' : '';
  categoryName.setAttribute('aria-invalid', String(Boolean(error)));
  document.getElementById('category-error').textContent = error;
  if (error) { categoryName.focus(); return; }
  categories.push({ id: crypto.randomUUID(), name, goal: null });
  save();
  categoryForm.reset();
  render();
  categoryName.focus();
});
activeCategory.addEventListener('change', () => {
  const active = cards.find(card => card.id === activeId);
  if (!active || !categories.some(category => category.id === activeCategory.value)) return;
  active.categoryId = activeCategory.value;
  save();
  render();
});
reviewMode.addEventListener('change', () => {
  onlyUnknown = reviewMode.value === 'unknown';
  flipped = false;
  hintOpen = false;
  render();
});
flashcard.addEventListener('click', () => {
  flipped = !flipped;
  render();
  triggerFlipAnimation();
});
hintToggle.addEventListener('click', () => {
  const active = cards.find(card => card.id === activeId);
  if (!active?.hint) return;
  hintOpen = !hintOpen;
  render();
});
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
