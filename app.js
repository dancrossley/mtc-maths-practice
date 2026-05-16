const TOTAL_QUESTIONS = 25;
const TIME_PER_QUESTION_MS = 6000;
const TIMEOUT_REVEAL_MS = 1500;
const FEEDBACK_FLASH_MS = 500;
const MAX_HISTORY = 20;
const RECENT_COUNT = 5;
const STORAGE_KEY_USERS = 'mtc.users';
const STORAGE_KEY_CURRENT = 'mtc.currentUser';

const nameScreen = document.getElementById('name-screen');
const startScreen = document.getElementById('start-screen');
const questionScreen = document.getElementById('question-screen');
const resultsScreen = document.getElementById('results-screen');

const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const userGreeting = document.getElementById('user-greeting');
const userHistory = document.getElementById('user-history');
const switchUserBtn = document.getElementById('switch-user-btn');
const resultsHistory = document.getElementById('results-history');

const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const pauseBtn = document.getElementById('pause-btn');

const counterEl = document.getElementById('question-counter');
const scoreEl = document.getElementById('score-display');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');
const questionCard = document.getElementById('question-card');
const questionText = document.getElementById('question-text');
const answerForm = document.getElementById('answer-form');
const answerInput = document.getElementById('answer-input');
const feedbackEl = document.getElementById('feedback');
const pauseOverlay = document.getElementById('pause-overlay');
const numpad = document.getElementById('numpad');
const backspaceBtn = document.getElementById('backspace-btn');
const submitBtn = document.getElementById('submit-btn');

const MAX_ANSWER_LENGTH = 3;

const finalScoreEl = document.getElementById('final-score');
const mistakesHeading = document.getElementById('mistakes-heading');
const mistakesList = document.getElementById('mistakes-list');

let questions = [];
let currentIndex = 0;
let score = 0;
let mistakes = [];
let timeoutId = null;
let countdownId = null;
let acceptingAnswer = false;
let paused = false;
let questionStartTime = 0;
let timeElapsedBeforePause = 0;
let currentUser = null;

function loadUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch {}
}

function getCurrentUser() {
  try {
    return localStorage.getItem(STORAGE_KEY_CURRENT) || null;
  } catch {
    return null;
  }
}

function setCurrentUser(name) {
  try {
    if (name) localStorage.setItem(STORAGE_KEY_CURRENT, name);
    else localStorage.removeItem(STORAGE_KEY_CURRENT);
  } catch {}
}

function findUserKey(users, name) {
  const target = name.trim().toLowerCase();
  return Object.keys(users).find((k) => k.toLowerCase() === target) || null;
}

function ensureUser(name) {
  const users = loadUsers();
  const existing = findUserKey(users, name);
  const key = existing || name.trim();
  if (!existing) {
    users[key] = { results: [] };
    saveUsers(users);
  }
  return key;
}

function recordResult(name, scoreValue, total) {
  const users = loadUsers();
  const key = findUserKey(users, name) || name.trim();
  if (!users[key]) users[key] = { results: [] };
  users[key].results.unshift({
    score: scoreValue,
    total,
    date: new Date().toISOString(),
  });
  if (users[key].results.length > MAX_HISTORY) {
    users[key].results.length = MAX_HISTORY;
  }
  saveUsers(users);
}

function getUserStats(name) {
  const users = loadUsers();
  const key = findUserKey(users, name);
  const results = key ? users[key].results : [];
  const best = results.reduce((m, r) => (r.score > m ? r.score : m), 0);
  return { best, results };
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateQuestions() {
  const result = [];
  for (let m = 1; m <= 12; m++) {
    const pool = [];
    for (let n = 1; n <= 12; n++) pool.push(n);
    shuffle(pool);
    const picks = pool.slice(0, 2);
    for (const n of picks) {
      result.push({ a: m, b: n, answer: m * n });
    }
  }
  const extraA = randInt(1, 12);
  const extraB = randInt(1, 12);
  result.push({ a: extraA, b: extraB, answer: extraA * extraB });
  return shuffle(result);
}

function showScreen(screen) {
  [nameScreen, startScreen, questionScreen, resultsScreen].forEach(s => s.classList.add('hidden'));
  screen.classList.remove('hidden');
}

function showNameScreen() {
  nameInput.value = currentUser || '';
  showScreen(nameScreen);
  setTimeout(() => nameInput.focus(), 0);
}

function enterStartScreen() {
  renderStartHistory(currentUser);
  showScreen(startScreen);
}

function renderStartHistory(name) {
  userGreeting.textContent = `Hi, ${name}`;
  const { best, results } = getUserStats(name);
  userHistory.innerHTML = '';
  if (results.length === 0) {
    const p = document.createElement('p');
    p.className = 'history-empty';
    p.textContent = 'No attempts yet — good luck!';
    userHistory.appendChild(p);
    return;
  }
  const summary = document.createElement('p');
  summary.className = 'history-summary';
  summary.textContent = `Best: ${best} / ${TOTAL_QUESTIONS} · ${results.length} attempt${results.length === 1 ? '' : 's'}`;
  userHistory.appendChild(summary);

  const list = document.createElement('ul');
  list.className = 'history-list';
  for (const r of results.slice(0, RECENT_COUNT)) {
    const li = document.createElement('li');
    const s = document.createElement('span');
    s.className = 'history-score';
    s.textContent = `${r.score} / ${r.total}`;
    const d = document.createElement('span');
    d.className = 'history-date';
    d.textContent = formatDate(r.date);
    li.appendChild(s);
    li.appendChild(d);
    list.appendChild(li);
  }
  userHistory.appendChild(list);
}

function renderResultsHistory(name) {
  const { best, results } = getUserStats(name);
  resultsHistory.innerHTML = '';
  if (results.length <= 1) {
    const p = document.createElement('p');
    p.className = 'history-empty';
    p.textContent = 'First attempt saved!';
    resultsHistory.appendChild(p);
    return;
  }
  const summary = document.createElement('p');
  summary.className = 'history-summary';
  const isBest = results[0].score === best && results.slice(1).every(r => r.score < best);
  summary.textContent = isBest
    ? `New best! Previous best: ${results.slice(1).reduce((m, r) => Math.max(m, r.score), 0)} / ${TOTAL_QUESTIONS}`
    : `Best: ${best} / ${TOTAL_QUESTIONS}`;
  resultsHistory.appendChild(summary);

  const list = document.createElement('ul');
  list.className = 'history-list';
  for (const r of results.slice(0, RECENT_COUNT)) {
    const li = document.createElement('li');
    const s = document.createElement('span');
    s.className = 'history-score';
    s.textContent = `${r.score} / ${r.total}`;
    const d = document.createElement('span');
    d.className = 'history-date';
    d.textContent = formatDate(r.date);
    li.appendChild(s);
    li.appendChild(d);
    list.appendChild(li);
  }
  resultsHistory.appendChild(list);
}

function handleNameSubmit(event) {
  event.preventDefault();
  const raw = nameInput.value.trim();
  if (!raw) return;
  const key = ensureUser(raw);
  currentUser = key;
  setCurrentUser(key);
  enterStartScreen();
}

function startTest() {
  questions = generateQuestions();
  currentIndex = 0;
  score = 0;
  mistakes = [];
  paused = false;
  pauseBtn.classList.remove('hidden');
  showScreen(questionScreen);
  loadQuestion();
}

function loadQuestion() {
  const q = questions[currentIndex];
  acceptingAnswer = true;
  paused = false;
  timeElapsedBeforePause = 0;

  counterEl.textContent = `Question ${currentIndex + 1} of ${TOTAL_QUESTIONS}`;
  scoreEl.textContent = `Score: ${score}`;
  questionText.textContent = `${q.a} × ${q.b} = ?`;
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
  questionCard.className = 'question-card';
  pauseOverlay.classList.add('hidden');

  answerInput.disabled = false;
  answerInput.value = '';
  setNumpadEnabled(true);

  pauseBtn.textContent = 'Pause';
  pauseBtn.disabled = false;

  resetTimer();
  startTimer(TIME_PER_QUESTION_MS);
}

function resetTimer() {
  if (timeoutId) clearTimeout(timeoutId);
  if (countdownId) clearInterval(countdownId);
  timerBar.style.transition = 'none';
  timerBar.style.width = '100%';
  timerBar.classList.remove('warn', 'danger');
  timerText.textContent = (TIME_PER_QUESTION_MS / 1000).toFixed(0);
  void timerBar.offsetWidth;
}

function startTimer(remainingMs) {
  questionStartTime = Date.now();

  timerBar.style.transition = `width ${remainingMs}ms linear`;
  timerBar.style.width = '0%';

  countdownId = setInterval(() => {
    const elapsed = Date.now() - questionStartTime + timeElapsedBeforePause;
    const remainingSec = Math.max(0, (TIME_PER_QUESTION_MS - elapsed) / 1000);
    timerText.textContent = Math.ceil(remainingSec).toString();
    if (remainingSec <= 1) {
      timerBar.classList.remove('warn');
      timerBar.classList.add('danger');
    } else if (remainingSec <= 2) {
      timerBar.classList.add('warn');
    }
  }, 200);

  timeoutId = setTimeout(handleTimeout, remainingMs);
}

function stopTimers() {
  if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
  if (countdownId) { clearInterval(countdownId); countdownId = null; }
}

function pauseTest() {
  if (!acceptingAnswer || paused) return;
  paused = true;

  const elapsed = Date.now() - questionStartTime + timeElapsedBeforePause;
  const fraction = Math.max(0, 1 - elapsed / TIME_PER_QUESTION_MS);
  stopTimers();
  timeElapsedBeforePause = elapsed;

  timerBar.style.transition = 'none';
  timerBar.style.width = `${fraction * 100}%`;

  answerInput.disabled = true;
  setNumpadEnabled(false);
  questionCard.classList.add('paused');
  pauseOverlay.classList.remove('hidden');
  pauseBtn.textContent = 'Resume';
}

function resumeTest() {
  if (!paused) return;
  paused = false;

  pauseOverlay.classList.add('hidden');
  questionCard.classList.remove('paused');
  answerInput.disabled = false;
  setNumpadEnabled(true);
  pauseBtn.textContent = 'Pause';

  const remainingMs = Math.max(0, TIME_PER_QUESTION_MS - timeElapsedBeforePause);

  void timerBar.offsetWidth;
  timerBar.style.transition = `width ${remainingMs}ms linear`;
  timerBar.style.width = '0%';

  startTimer(remainingMs);
}

function handleSubmit(event) {
  event.preventDefault();
  if (!acceptingAnswer || paused) return;
  const raw = answerInput.value.trim();
  if (raw === '') return;
  const given = Number(raw);
  if (!Number.isFinite(given)) return;

  acceptingAnswer = false;
  pauseBtn.disabled = true;
  setNumpadEnabled(false);
  stopTimers();

  const q = questions[currentIndex];
  if (given === q.answer) {
    score += 1;
    scoreEl.textContent = `Score: ${score}`;
    questionCard.classList.add('correct');
    feedbackEl.textContent = 'Correct!';
    feedbackEl.classList.add('correct');
    setTimeout(advance, FEEDBACK_FLASH_MS);
  } else {
    mistakes.push({ a: q.a, b: q.b, answer: q.answer, given });
    questionCard.classList.add('wrong');
    feedbackEl.textContent = `Wrong — answer was ${q.answer}`;
    feedbackEl.classList.add('wrong');
    setTimeout(advance, TIMEOUT_REVEAL_MS);
  }
}

function handleTimeout() {
  if (!acceptingAnswer) return;
  acceptingAnswer = false;
  pauseBtn.disabled = true;
  setNumpadEnabled(false);
  stopTimers();
  answerInput.disabled = true;

  const q = questions[currentIndex];
  mistakes.push({ a: q.a, b: q.b, answer: q.answer, given: null });
  questionCard.classList.add('wrong');
  feedbackEl.textContent = `Time's up — answer was ${q.answer}`;
  feedbackEl.classList.add('wrong');
  setTimeout(advance, TIMEOUT_REVEAL_MS);
}

function advance() {
  currentIndex += 1;
  if (currentIndex >= TOTAL_QUESTIONS) {
    showResults();
  } else {
    loadQuestion();
  }
}

function showResults() {
  stopTimers();
  pauseBtn.classList.add('hidden');
  if (currentUser) recordResult(currentUser, score, TOTAL_QUESTIONS);
  finalScoreEl.textContent = `Score: ${score} / ${TOTAL_QUESTIONS}`;
  if (currentUser) renderResultsHistory(currentUser);
  mistakesList.innerHTML = '';

  if (mistakes.length === 0) {
    mistakesHeading.classList.add('hidden');
  } else {
    mistakesHeading.classList.remove('hidden');
    for (const m of mistakes) {
      const li = document.createElement('li');
      const q = document.createElement('span');
      q.className = 'mistake-q';
      q.textContent = `${m.a} × ${m.b}`;
      const a = document.createElement('span');
      a.className = 'mistake-a';
      const givenText = m.given === null ? 'no answer' : `you: ${m.given}`;
      a.innerHTML = `<span class="mistake-given">${givenText}</span> &nbsp; = ${m.answer}`;
      li.appendChild(q);
      li.appendChild(a);
      mistakesList.appendChild(li);
    }
  }
  showScreen(resultsScreen);
}

function setNumpadEnabled(enabled) {
  numpad.querySelectorAll('button').forEach((b) => { b.disabled = !enabled; });
}

function appendDigit(d) {
  if (!acceptingAnswer || paused) return;
  if (answerInput.value.length >= MAX_ANSWER_LENGTH) return;
  answerInput.value += d;
}

function backspaceDigit() {
  if (!acceptingAnswer || paused) return;
  answerInput.value = answerInput.value.slice(0, -1);
}

numpad.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-digit]');
  if (!btn) return;
  appendDigit(btn.dataset.digit);
});

backspaceBtn.addEventListener('click', backspaceDigit);

document.addEventListener('keydown', (e) => {
  if (questionScreen.classList.contains('hidden')) return;
  if (e.key >= '0' && e.key <= '9') appendDigit(e.key);
  else if (e.key === 'Backspace') { e.preventDefault(); backspaceDigit(); }
});

startBtn.addEventListener('click', startTest);
restartBtn.addEventListener('click', startTest);
answerForm.addEventListener('submit', handleSubmit);
pauseBtn.addEventListener('click', () => paused ? resumeTest() : pauseTest());
nameForm.addEventListener('submit', handleNameSubmit);
switchUserBtn.addEventListener('click', () => {
  setCurrentUser(null);
  currentUser = null;
  showNameScreen();
});

function bootstrap() {
  const saved = getCurrentUser();
  if (saved) {
    currentUser = saved;
    ensureUser(saved);
    enterStartScreen();
  } else {
    showNameScreen();
  }
}

bootstrap();

window.generateQuestions = generateQuestions;
