const TOTAL_QUESTIONS = 25;
const TIME_PER_QUESTION_MS = 6000;
const TIMEOUT_REVEAL_MS = 1500;
const FEEDBACK_FLASH_MS = 500;

const startScreen = document.getElementById('start-screen');
const questionScreen = document.getElementById('question-screen');
const resultsScreen = document.getElementById('results-screen');

const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

const counterEl = document.getElementById('question-counter');
const scoreEl = document.getElementById('score-display');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');
const questionCard = document.getElementById('question-card');
const questionText = document.getElementById('question-text');
const answerForm = document.getElementById('answer-form');
const answerInput = document.getElementById('answer-input');
const feedbackEl = document.getElementById('feedback');

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
  showScreen(questionScreen);
  loadQuestion();
}

function loadQuestion() {
  const q = questions[currentIndex];
  acceptingAnswer = true;

  counterEl.textContent = `Question ${currentIndex + 1} of ${TOTAL_QUESTIONS}`;
  scoreEl.textContent = `Score: ${score}`;
  questionText.textContent = `${q.a} × ${q.b} = ?`;
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
  questionCard.className = 'question-card';

  answerInput.disabled = false;
  answerInput.value = '';
  answerInput.focus();

  resetTimer();
  startTimer();
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

function startTimer() {
  timerBar.style.transition = `width ${TIME_PER_QUESTION_MS}ms linear`;
  timerBar.style.width = '0%';

  let remaining = TIME_PER_QUESTION_MS / 1000;
  timerText.textContent = remaining.toFixed(0);
  countdownId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      timerText.textContent = '0';
      clearInterval(countdownId);
      return;
    }
    timerText.textContent = remaining.toFixed(0);
    if (remaining <= 1) {
      timerBar.classList.remove('warn');
      timerBar.classList.add('danger');
    } else if (remaining <= 2) {
      timerBar.classList.add('warn');
    }
  }, 1000);

  timeoutId = setTimeout(handleTimeout, TIME_PER_QUESTION_MS);
}

function stopTimers() {
  if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
  if (countdownId) { clearInterval(countdownId); countdownId = null; }
}

function handleSubmit(event) {
  event.preventDefault();
  if (!acceptingAnswer) return;
  const raw = answerInput.value.trim();
  if (raw === '') return;
  const given = Number(raw);
  if (!Number.isFinite(given)) return;

  acceptingAnswer = false;
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

window.generateQuestions = generateQuestions;
