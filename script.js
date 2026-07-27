/**
 * Cek Wawasan Bela Negara - Core Quiz Logic (Tahap 5 - localStorage History)
 */

// LocalStorage Constant Key
const STORAGE_KEY = 'bela_negara_quiz_history';

// State Management Variables
let questionsData = [];
let currentQuestionIndex = 0;
let score = 0;
let isAnswered = false;

// Category Score Tracker
let categoryScores = {};
let categoryTotals = {};

// DOM Element References
const screenIntro = document.getElementById('screen-intro');
const screenQuiz = document.getElementById('screen-quiz');
const screenResult = document.getElementById('screen-result');

const btnStart = document.getElementById('btn-start');
const btnNext = document.getElementById('btn-next');
const btnNextLabel = document.getElementById('btn-next-label');
const btnRestart = document.getElementById('btn-restart');

// Quiz Screen Elements
const questionCategory = document.getElementById('question-category');
const questionCounter = document.getElementById('question-counter');
const progressBar = document.getElementById('progress-bar');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');

const explanationBox = document.getElementById('explanation-box');
const feedbackIcon = document.getElementById('feedback-icon');
const feedbackStatus = document.getElementById('feedback-status');
const explanationText = document.getElementById('explanation-text');

// Result Screen Elements
const resultScoreBadge = document.getElementById('result-score-badge');
const resultCategoryTag = document.getElementById('result-category-tag');
const highScoreText = document.getElementById('high-score-text');
const resultRecommendationText = document.getElementById('result-recommendation-text');
const breakdownGrid = document.getElementById('breakdown-grid');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  if (btnStart) btnStart.addEventListener('click', startQuiz);
  if (btnNext) btnNext.addEventListener('click', handleNextQuestion);
  if (btnRestart) btnRestart.addEventListener('click', restartQuiz);

  loadQuestionsData();
}

/**
 * Fetch questions from data/soal.json
 */
async function loadQuestionsData() {
  try {
    const response = await fetch('./data/soal.json');
    if (!response.ok) {
      throw new Error(`Gagal memuat data soal (HTTP ${response.status})`);
    }
    questionsData = await response.json();
    console.log(`Berhasil memuat ${questionsData.length} soal.`);
  } catch (error) {
    console.error('Error loading quiz data:', error);
    alert('Gagal memuat data kuis. Pastikan file data/soal.json tersedia.');
  }
}

/**
 * Start the Quiz session
 */
function startQuiz() {
  if (!questionsData || questionsData.length === 0) {
    alert('Data soal belum siap. Silakan muat ulang halaman.');
    return;
  }

  // Reset Session State
  currentQuestionIndex = 0;
  score = 0;
  isAnswered = false;

  // Initialize Category Score Trackers
  categoryScores = {};
  categoryTotals = {};
  questionsData.forEach(q => {
    categoryTotals[q.kategori] = (categoryTotals[q.kategori] || 0) + 1;
    if (!(q.kategori in categoryScores)) {
      categoryScores[q.kategori] = 0;
    }
  });

  // Screen Transition: Hide Intro & Result, Show Quiz
  screenIntro.classList.add('hidden');
  screenResult.classList.add('hidden');
  screenQuiz.classList.remove('hidden');

  // Render First Question
  renderQuestion();
}

/**
 * Render current question UI
 */
function renderQuestion() {
  isAnswered = false;
  const q = questionsData[currentQuestionIndex];
  const totalQuestions = questionsData.length;

  // 1. Update Header Info & Progress Bar
  questionCategory.textContent = q.kategori;
  questionCounter.textContent = `Soal ${currentQuestionIndex + 1} dari ${totalQuestions}`;
  
  const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  progressBar.style.width = `${progressPercent}%`;

  // 2. Render Question Text
  questionText.textContent = q.pertanyaan;

  // 3. Clear & Render Options
  optionsContainer.innerHTML = '';
  const optionLetters = ['A', 'B', 'C', 'D'];

  q.opsi.forEach((optionTextContent, index) => {
    const optionBtn = document.createElement('button');
    optionBtn.className = 'option-btn';
    optionBtn.dataset.index = index;

    optionBtn.innerHTML = `
      <span class="option-letter">${optionLetters[index]}</span>
      <span class="option-text">${optionTextContent}</span>
    `;

    optionBtn.addEventListener('click', () => handleSelectOption(index));
    optionsContainer.appendChild(optionBtn);
  });

  // 4. Hide Feedback & Next Button
  explanationBox.classList.add('hidden');
  explanationBox.className = 'explanation-box hidden';
  btnNext.classList.add('hidden');

  // Update Next Button Label if on last question
  if (currentQuestionIndex === totalQuestions - 1) {
    btnNextLabel.textContent = 'Lihat Hasil Akhir';
  } else {
    btnNextLabel.textContent = 'Soal Berikutnya';
  }
}

/**
 * Handle option selection
 * @param {number} selectedIndex 
 */
function handleSelectOption(selectedIndex) {
  if (isAnswered) return;
  isAnswered = true;

  const q = questionsData[currentQuestionIndex];
  const correctIndex = q.jawabanBenar;
  const isCorrect = selectedIndex === correctIndex;

  const allOptionBtns = optionsContainer.querySelectorAll('.option-btn');

  if (isCorrect) {
    score++;
    categoryScores[q.kategori]++;
    allOptionBtns[selectedIndex].classList.add('correct');
    showExplanation(true, q.penjelasan);
  } else {
    allOptionBtns[selectedIndex].classList.add('wrong');
    allOptionBtns[correctIndex].classList.add('correct');
    showExplanation(false, q.penjelasan);
  }

  // Disable options
  allOptionBtns.forEach(btn => btn.classList.add('disabled'));

  // Show Next Button
  btnNext.classList.remove('hidden');
}

/**
 * Display explanation feedback box
 */
function showExplanation(isCorrect, explanation) {
  explanationBox.classList.remove('hidden');

  if (isCorrect) {
    explanationBox.className = 'explanation-box correct-theme';
    feedbackIcon.textContent = '✅';
    feedbackStatus.textContent = 'Jawaban Benar!';
  } else {
    explanationBox.className = 'explanation-box wrong-theme';
    feedbackIcon.textContent = '❌';
    feedbackStatus.textContent = 'Jawaban Kurang Tepat';
  }

  explanationText.textContent = explanation;
}

/**
 * Handle Next Question or Show Result
 */
function handleNextQuestion() {
  if (currentQuestionIndex < questionsData.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    showResultScreen();
  }
}

/**
 * Render Final Result Screen & Handle LocalStorage (Tahap 4 & 5)
 */
function showResultScreen() {
  const totalQuestions = questionsData.length;

  // 1. Hide Quiz Screen, Show Result Screen
  screenQuiz.classList.add('hidden');
  screenResult.classList.remove('hidden');

  // 2. Set Total Score
  resultScoreBadge.textContent = `${score} / ${totalQuestions}`;

  // 3. Determine Category Rank & Recommendation Text
  let categoryName = '';
  let tagClass = '';
  let recommendation = '';

  if (score <= 6) {
    categoryName = 'Perlu Diperdalam Lagi';
    tagClass = 'tag-needs-work';
    recommendation = 'Yuk, luangkan waktu untuk membaca kembali sejarah perjuangan bangsa, konstitusi UUD 1945, serta nilai-nilai Pancasila agar wawasan kebangsaanmu semakin mantap!';
  } else if (score <= 11) {
    categoryName = 'Cukup Paham';
    tagClass = 'tag-good';
    recommendation = 'Pemahamanmu tentang wawasan nusantara dan bela negara sudah cukup baik. Terus tingkatkan literasi kebangsaan dan terapkan nilai Pancasila dalam kehidupan sehari-hari!';
  } else {
    categoryName = 'Sangat Memahami';
    tagClass = 'tag-excellent';
    recommendation = 'Luar biasa! Kamu memiliki wawasan bela negara dan rasa nasionalisme yang sangat kuat. Jadilah agen perubahan dan teladan Pancasila bagi generasi muda di lingkunganmu!';
  }

  resultCategoryTag.textContent = categoryName;
  resultCategoryTag.className = `category-result-tag ${tagClass}`;
  resultRecommendationText.textContent = recommendation;

  // 4. Handle High Score & LocalStorage (Tahap 5)
  const previousBest = getHighScore();
  if (previousBest === null) {
    highScoreText.textContent = 'Percobaan Pertama! 🌟';
  } else if (score > previousBest) {
    highScoreText.textContent = `Skor terbaikmu: ${score} dari ${totalQuestions} 🎉 (Rekor Baru!)`;
  } else {
    highScoreText.textContent = `Skor terbaikmu: ${previousBest} dari ${totalQuestions}`;
  }

  // Save current quiz attempt to history array in localStorage
  saveQuizAttempt(score, totalQuestions, categoryName);

  // 5. Render Breakdown per Category
  breakdownGrid.innerHTML = '';
  Object.keys(categoryTotals).forEach(cat => {
    const catScore = categoryScores[cat] || 0;
    const catTotal = categoryTotals[cat];

    const card = document.createElement('div');
    card.className = 'breakdown-card';
    card.innerHTML = `
      <span class="breakdown-card-name">${cat}</span>
      <span class="breakdown-card-score">${catScore} / ${catTotal} Benar</span>
    `;
    breakdownGrid.appendChild(card);
  });
}

/**
 * Restart Quiz Session
 */
function restartQuiz() {
  startQuiz();
}

/* ==========================================================================
   LocalStorage Helper Functions (Tahap 5)
   ========================================================================== */

/**
 * Get all history attempts from localStorage safely
 * @returns {Array} List of past quiz attempts
 */
function getQuizHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('localStorage tidak tersedia atau terjadi error:', error);
    return [];
  }
}

/**
 * Save a new quiz attempt to localStorage array safely
 * @param {number} score 
 * @param {number} total 
 * @param {string} category 
 */
function saveQuizAttempt(score, total, category) {
  try {
    const history = getQuizHistory();
    const newEntry = {
      tanggal: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      skor: score,
      total: total,
      kategori: category
    };

    history.push(newEntry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Gagal menyimpan ke localStorage:', error);
  }
}

/**
 * Get highest score achieved previously from localStorage
 * @returns {number|null} Max score or null if no previous attempts
 */
function getHighScore() {
  const history = getQuizHistory();
  if (!history || history.length === 0) return null;

  return Math.max(...history.map(item => item.skor));
}
