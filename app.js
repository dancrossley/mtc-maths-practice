const TOTAL_QUESTIONS = 25;
const TIME_PER_QUESTION_MS = 6000;
const TIMEOUT_REVEAL_MS = 1500;
const FEEDBACK_FLASH_MS = 500;

const startScreen = document.getElementById('start-screen');
const questionScreen = document.getElementById('question-screen');
const resultsScreen = document.getElementById('results-screen');

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
  [startScreen, questionScreen, resultsScreen].forEach(s => s.classList.add('hidden'));
  screen.classList.remove('hidden');
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
  answerInput.focus();

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
  answerInput.focus();
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
  finalScoreEl.textContent = `Score: ${score} / ${TOTAL_QUESTIONS}`;
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

startBtn.addEventListener('click', startTest);
restartBtn.addEventListener('click', startTest);
answerForm.addEventListener('submit', handleSubmit);
pauseBtn.addEventListener('click', () => paused ? resumeTest() : pauseTest());

window.generateQuestions = generateQuestions;
