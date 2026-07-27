/**
 * Cek Wawasan Bela Negara - Core Quiz & Supabase Realtime Multiplayer Logic (Mode B)
 */

// ==========================================
// 1. SUPABASE CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://cavecpoirbizmpnbsubx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdmVjcG9pcmJpem1wbmJzdWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjI4MDgsImV4cCI6MjEwMDczODgwOH0.0iD90_HdsJLvCMQQm50XUcq_boia2iiDp9Q1nQ7bdzM';

let supabaseClient = null;
if (typeof window.supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized successfully.');
  } catch (err) {
    console.warn('Gagal inisialisasi Supabase client:', err);
  }
}

// LocalStorage Constant Key (For Solo Mode History)
const STORAGE_KEY = 'bela_negara_quiz_history';

// ==========================================
// 2. STATE MANAGEMENT VARIABLES
// ==========================================
let questionsData = [];
let currentQuestionIndex = 0;
let score = 0;
let isAnswered = false;

// Timer State
let timerInterval = null;
let elapsedSeconds = 0;

// Current Session Info
let isSoloMode = true;
let currentRoom = null; // { id, game_pin, nama_room, nama_guru }
let currentStudent = null; // { nama_siswa, kelas }

// Realtime Subscriptions
let hostRealtimeChannel = null;
let playerRealtimeChannel = null;

// Category Score Tracker
let categoryScores = {};
let categoryTotals = {};

// ==========================================
// 3. DOM ELEMENT REFERENCES
// ==========================================
// Screens
const screenIntro = document.getElementById('screen-intro');
const screenJoinPin = document.getElementById('screen-join-pin');
const screenCreateRoom = document.getElementById('screen-create-room');
const screenHostDashboard = document.getElementById('screen-host-dashboard');
const screenQuiz = document.getElementById('screen-quiz');
const screenResult = document.getElementById('screen-result');

// Buttons
const btnGotoJoin = document.getElementById('btn-goto-join');
const btnGotoCreate = document.getElementById('btn-goto-create');
const btnStartSolo = document.getElementById('btn-start-solo');
const btnNext = document.getElementById('btn-next');
const btnNextLabel = document.getElementById('btn-next-label');
const btnRestart = document.getElementById('btn-restart');
const btnCopyPin = document.getElementById('btn-copy-pin');

// Forms & Inputs
const formJoinPin = document.getElementById('form-join-pin');
const inputPin = document.getElementById('input-pin');
const inputStudentName = document.getElementById('input-student-name');
const inputStudentClass = document.getElementById('input-student-class');
const joinErrorMsg = document.getElementById('join-error-msg');

const formCreateRoom = document.getElementById('form-create-room');
const inputRoomName = document.getElementById('input-room-name');
const inputHostName = document.getElementById('input-host-name');
const createErrorMsg = document.getElementById('create-error-msg');

// Host Dashboard Elements
const hostRoomTitle = document.getElementById('host-room-title');
const displayGamePin = document.getElementById('display-game-pin');
const hostTeacherName = document.getElementById('host-teacher-name');
const hostPlayerCount = document.getElementById('host-player-count');
const hostPodiumContainer = document.getElementById('host-podium-container');
const hostLeaderboardBody = document.getElementById('host-leaderboard-body');

// Quiz Screen Elements
const questionCategory = document.getElementById('question-category');
const quizTimer = document.getElementById('quiz-timer');
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
const resultTimeBadge = document.getElementById('result-time-badge');
const resultCategoryTag = document.getElementById('result-category-tag');
const highScoreText = document.getElementById('high-score-text');
const resultRecommendationText = document.getElementById('result-recommendation-text');
const breakdownGrid = document.getElementById('breakdown-grid');

const playerRoomLeaderboard = document.getElementById('player-room-leaderboard');
const playerPinLabel = document.getElementById('player-pin-label');
const playerPodiumContainer = document.getElementById('player-podium-container');
const playerLeaderboardBody = document.getElementById('player-leaderboard-body');

// ==========================================
// 4. INITIALIZATION & NAVIGATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Navigation Event Listeners
  if (btnGotoJoin) btnGotoJoin.addEventListener('click', () => showScreen(screenJoinPin));
  if (btnGotoCreate) btnGotoCreate.addEventListener('click', () => showScreen(screenCreateRoom));
  if (btnStartSolo) btnStartSolo.addEventListener('click', startSoloQuiz);

  // Back to Lobby buttons
  document.querySelectorAll('.btn-back-lobby').forEach(btn => {
    btn.addEventListener('click', backToLobby);
  });

  // Forms
  if (formJoinPin) formJoinPin.addEventListener('submit', handleJoinPinSubmit);
  if (formCreateRoom) formCreateRoom.addEventListener('submit', handleCreateRoomSubmit);
  if (btnCopyPin) btnCopyPin.addEventListener('click', copyPinToClipboard);

  // Quiz Navigation
  if (btnNext) btnNext.addEventListener('click', handleNextQuestion);
  if (btnRestart) btnRestart.addEventListener('click', restartQuiz);

  // Load Questions Data
  loadQuestionsData();
}

/**
 * Switch active screen view safely
 */
function showScreen(targetScreen) {
  const allScreens = [screenIntro, screenJoinPin, screenCreateRoom, screenHostDashboard, screenQuiz, screenResult];
  allScreens.forEach(s => {
    if (s) s.classList.add('hidden');
  });
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Reset state & go back to Lobby
 */
function backToLobby() {
  stopTimer();
  unsubscribeChannels();
  isSoloMode = true;
  currentRoom = null;
  currentStudent = null;
  if (joinErrorMsg) joinErrorMsg.classList.add('hidden');
  if (createErrorMsg) createErrorMsg.classList.add('hidden');
  showScreen(screenIntro);
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

// ==========================================
// 5. HOST CREATING ROOM FLOW
// ==========================================
async function handleCreateRoomSubmit(e) {
  e.preventDefault();
  const roomName = inputRoomName.value.trim();
  const hostName = inputHostName.value.trim();

  if (!roomName || !hostName) return;

  if (!supabaseClient) {
    alert('Supabase belum terkonfigurasi. Menggunakan simulasi ruangan lokal.');
    setupSimulatedHostDashboard(roomName, hostName);
    return;
  }

  // Generate Unique 6-Digit Game PIN
  const gamePin = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const { data, error } = await supabaseClient
      .from('rooms')
      .insert([
        {
          game_pin: gamePin,
          nama_room: roomName,
          nama_guru: hostName,
          status: 'active'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    currentRoom = data;
    setupHostDashboard(data);
  } catch (err) {
    console.error('Gagal membuat ruangan Supabase:', err);
    if (createErrorMsg) {
      createErrorMsg.textContent = `⚠️ Gagal membuat ruangan: ${err.message || 'Error koneksi Supabase'}`;
      createErrorMsg.classList.remove('hidden');
    }
  }
}

function setupHostDashboard(roomData) {
  showScreen(screenHostDashboard);
  if (hostRoomTitle) hostRoomTitle.textContent = `👑 ${roomData.nama_room}`;
  if (displayGamePin) displayGamePin.textContent = roomData.game_pin;
  if (hostTeacherName) hostTeacherName.textContent = `Host: ${roomData.nama_guru}`;

  // Fetch initial players & setup realtime listener
  fetchAndRenderHostLeaderboard(roomData.id);
  subscribeToHostRealtime(roomData.id);
}

function setupSimulatedHostDashboard(roomName, hostName) {
  const dummyRoom = {
    id: 'local-demo',
    game_pin: Math.floor(100000 + Math.random() * 900000).toString(),
    nama_room: roomName,
    nama_guru: hostName
  };
  currentRoom = dummyRoom;
  setupHostDashboard(dummyRoom);
}

async function fetchAndRenderHostLeaderboard(roomId) {
  if (!supabaseClient || roomId === 'local-demo') return;

  try {
    const { data, error } = await supabaseClient
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('skor', { ascending: false })
      .order('durasi_detik', { ascending: true });

    if (error) throw error;

    renderLeaderboardUI(data || [], hostPodiumContainer, hostLeaderboardBody, hostPlayerCount);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
  }
}

function subscribeToHostRealtime(roomId) {
  if (!supabaseClient || roomId === 'local-demo') return;

  unsubscribeChannels();

  hostRealtimeChannel = supabaseClient
    .channel(`public:players:room_id=eq.${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
      () => {
        console.log('Realtime player update detected!');
        fetchAndRenderHostLeaderboard(roomId);
      }
    )
    .subscribe();
}

// ==========================================
// 6. STUDENT JOINING PIN FLOW
// ==========================================
async function handleJoinPinSubmit(e) {
  e.preventDefault();
  const pin = inputPin.value.trim();
  const studentName = inputStudentName.value.trim();
  const studentClass = inputStudentClass.value.trim();

  if (!pin || !studentName || !studentClass) return;

  if (joinErrorMsg) joinErrorMsg.classList.add('hidden');

  if (!supabaseClient) {
    alert('Supabase belum terkonfigurasi. Memulai kuis sebagai Latihan Mandiri.');
    currentStudent = { nama_siswa: studentName, kelas: studentClass };
    startQuizSession(false);
    return;
  }

  try {
    // Validate PIN in Supabase rooms table
    const { data, error } = await supabaseClient
      .from('rooms')
      .select('*')
      .eq('game_pin', pin)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      if (joinErrorMsg) {
        joinErrorMsg.textContent = '⚠️ Game PIN tidak ditemukan atau telah ditutup!';
        joinErrorMsg.classList.remove('hidden');
      }
      return;
    }

    currentRoom = data;
    currentStudent = { nama_siswa: studentName, kelas: studentClass };
    isSoloMode = false;

    // Start Quiz for Student
    startQuizSession(false);
  } catch (err) {
    console.error('Error joining room:', err);
    if (joinErrorMsg) {
      joinErrorMsg.textContent = '⚠️ Gagal terhubung ke ruang kuis. Periksa PIN & koneksi.';
      joinErrorMsg.classList.remove('hidden');
    }
  }
}

// ==========================================
// 7. QUIZ CORE ENGINE & TIMER
// ==========================================
function startSoloQuiz() {
  isSoloMode = true;
  currentRoom = null;
  currentStudent = null;
  startQuizSession(true);
}

function startQuizSession(solo = true) {
  if (!questionsData || questionsData.length === 0) {
    alert('Data soal belum siap. Silakan muat ulang halaman.');
    return;
  }

  isSoloMode = solo;
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

  // Start Timer
  startTimer();

  // Show Quiz Screen
  showScreen(screenQuiz);

  // Render First Question
  renderQuestion();
}

function startTimer() {
  stopTimer();
  elapsedSeconds = 0;
  updateTimerUI();
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    updateTimerUI();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerUI() {
  if (quizTimer) {
    quizTimer.textContent = `⏱️ ${formatTime(elapsedSeconds)}`;
  }
}

function formatTime(totalSec) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Render the current question
 */
function renderQuestion() {
  isAnswered = false;

  const q = questionsData[currentQuestionIndex];

  // Header & Meta
  questionCategory.textContent = q.kategori;
  questionCounter.textContent = `Soal ${currentQuestionIndex + 1} dari ${questionsData.length}`;
  const progressPercent = ((currentQuestionIndex + 1) / questionsData.length) * 100;
  progressBar.style.width = `${progressPercent}%`;

  // Question Text
  questionText.textContent = q.pertanyaan;

  // Reset UI Boxes
  explanationBox.classList.add('hidden');
  btnNext.classList.add('hidden');

  // Options
  optionsContainer.innerHTML = '';
  const optionLabels = ['A', 'B', 'C', 'D'];

  q.opsi.forEach((optText, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.setAttribute('data-index', index);

    const badge = document.createElement('span');
    badge.className = 'option-badge';
    badge.textContent = optionLabels[index];

    const text = document.createElement('span');
    text.className = 'option-text';
    text.textContent = optText;

    btn.appendChild(badge);
    btn.appendChild(text);

    btn.addEventListener('click', () => handleSelectOption(index));
    optionsContainer.appendChild(btn);
  });
}

/**
 * Handle Option Selection
 */
function handleSelectOption(selectedIndex) {
  if (isAnswered) return;
  isAnswered = true;

  const q = questionsData[currentQuestionIndex];
  const isCorrect = selectedIndex === q.jawabanBenar;
  const allOptionBtns = optionsContainer.querySelectorAll('.option-btn');

  if (isCorrect) {
    score++;
    categoryScores[q.kategori]++;
    allOptionBtns[selectedIndex].classList.add('correct');
    showExplanation(true, q.penjelasan);
  } else {
    allOptionBtns[selectedIndex].classList.add('wrong');
    allOptionBtns[q.jawabanBenar].classList.add('correct');
    showExplanation(false, q.penjelasan);
  }

  // Disable all options
  allOptionBtns.forEach(btn => btn.classList.add('disabled'));

  // Show Next Button
  if (currentQuestionIndex === questionsData.length - 1) {
    btnNextLabel.textContent = 'Lihat Hasil Kuis';
  } else {
    btnNextLabel.textContent = 'Soal Berikutnya';
  }
  btnNext.classList.remove('hidden');
}

function showExplanation(isCorrect, text) {
  explanationBox.classList.remove('hidden');
  if (isCorrect) {
    explanationBox.className = 'explanation-box correct';
    feedbackIcon.textContent = '✅';
    feedbackStatus.textContent = 'Jawaban Tepat!';
  } else {
    explanationBox.className = 'explanation-box wrong';
    feedbackIcon.textContent = '❌';
    feedbackStatus.textContent = 'Jawaban Kurang Tepat';
  }
  explanationText.textContent = text;
}

function handleNextQuestion() {
  if (currentQuestionIndex < questionsData.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    finishQuiz();
  }
}

// ==========================================
// 8. RESULT & SUBMISSION FLOW
// ==========================================
async function finishQuiz() {
  stopTimer();
  showScreen(screenResult);

  const total = questionsData.length;

  // Score & Time Display
  resultScoreBadge.textContent = `${score} / ${total}`;
  if (resultTimeBadge) resultTimeBadge.textContent = `⏱️ Waktu: ${formatTime(elapsedSeconds)}`;

  // Performance Classification
  let categoryName = '';
  let tagClass = '';
  let recommendation = '';

  if (score <= 6) {
    categoryName = 'Perlu Diperdalam Lagi';
    tagClass = 'tag-needs-work';
    recommendation = 'Yuk, luangkan waktu untuk membaca kembali sejarah perjuangan bangsa, konstitusi UUD 1945, serta penerapan nilai-nilai Pancasila dalam kehidupan sehari-hari.';
  } else if (score <= 11) {
    categoryName = 'Cukup Paham';
    tagClass = 'tag-good';
    recommendation = 'Pemahamanmu tentang wawasan nusantara dan bela negara sudah cukup baik. Terus tingkatkan dengan mengikuti kegiatan kebangsaan dan menjaga kesatuan!';
  } else {
    categoryName = 'Sangat Memahami';
    tagClass = 'tag-excellent';
    recommendation = 'Luar biasa! Kamu memiliki wawasan bela negara dan rasa nasionalisme yang sangat kuat. Pertahankan dan jadilah teladan bagi teman-temanmu!';
  }

  resultCategoryTag.textContent = categoryName;
  resultCategoryTag.className = `category-result-tag ${tagClass}`;
  resultRecommendationText.textContent = recommendation;

  // Category Breakdown
  renderCategoryBreakdown();

  // Save to Local Storage History
  saveQuizAttempt(score, total, categoryName);
  updateHighScoreDisplay();

  // Handle Supabase Multiplayer Submission (If PIN Mode)
  if (!isSoloMode && currentRoom && currentStudent) {
    await submitScoreToSupabase(score, total, elapsedSeconds);
  } else {
    if (playerRoomLeaderboard) playerRoomLeaderboard.classList.add('hidden');
  }
}

async function submitScoreToSupabase(finalScore, totalQuestions, durationSec) {
  if (!supabaseClient || !currentRoom) return;

  if (playerRoomLeaderboard) {
    playerRoomLeaderboard.classList.remove('hidden');
    if (playerPinLabel) playerPinLabel.textContent = currentRoom.game_pin;
  }

  try {
    const { error } = await supabaseClient
      .from('players')
      .insert([
        {
          room_id: currentRoom.id,
          nama_siswa: currentStudent.nama_siswa,
          kelas: currentStudent.kelas,
          skor: finalScore,
          total_soal: totalQuestions,
          durasi_detik: durationSec
        }
      ]);

    if (error) throw error;

    console.log('Skor berhasil dikirim ke Supabase!');

    // Fetch and display live room leaderboard for player
    fetchAndRenderPlayerLeaderboard(currentRoom.id);
    subscribeToPlayerRealtime(currentRoom.id);
  } catch (err) {
    console.error('Gagal mengirim skor ke Supabase:', err);
  }
}

async function fetchAndRenderPlayerLeaderboard(roomId) {
  if (!supabaseClient || roomId === 'local-demo') return;

  try {
    const { data, error } = await supabaseClient
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('skor', { ascending: false })
      .order('durasi_detik', { ascending: true });

    if (error) throw error;

    renderLeaderboardUI(data || [], playerPodiumContainer, playerLeaderboardBody, null);
  } catch (err) {
    console.error('Error fetching player leaderboard:', err);
  }
}

function subscribeToPlayerRealtime(roomId) {
  if (!supabaseClient || roomId === 'local-demo') return;

  unsubscribeChannels();

  playerRealtimeChannel = supabaseClient
    .channel(`public:players:room_id=eq.${roomId}:player`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
      () => {
        fetchAndRenderPlayerLeaderboard(roomId);
      }
    )
    .subscribe();
}

/**
 * Render Podium Top 3 and Leaderboard Table
 */
function renderLeaderboardUI(playersList, podiumContainer, tbodyContainer, countSpan) {
  if (countSpan) {
    countSpan.textContent = `${playersList.length} Siswa Selesai`;
  }

  // Render Podium Top 3
  if (podiumContainer) {
    podiumContainer.innerHTML = '';
    if (playersList.length > 0) {
      podiumContainer.classList.remove('hidden');

      const top3 = playersList.slice(0, 3);
      const crowns = ['🥇', '🥈', '🥉'];

      top3.forEach((p, idx) => {
        const card = document.createElement('div');
        card.className = `podium-card rank-${idx + 1}`;
        card.innerHTML = `
          <div class="podium-crown">${crowns[idx]}</div>
          <div class="podium-name" title="${escapeHtml(p.nama_siswa)}">${escapeHtml(p.nama_siswa)}</div>
          <div class="podium-score">${p.skor}/${p.total_soal || 16} (${formatTime(p.durasi_detik)})</div>
        `;
        podiumContainer.appendChild(card);
      });
    } else {
      podiumContainer.classList.add('hidden');
    }
  }

  // Render Table
  if (tbodyContainer) {
    tbodyContainer.innerHTML = '';

    if (playersList.length === 0) {
      tbodyContainer.innerHTML = `<tr><td colspan="5" class="table-empty">Belum ada siswa yang menyelesaikan kuis...</td></tr>`;
      return;
    }

    playersList.forEach((p, idx) => {
      const tr = document.createElement('tr');
      const rankBadge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;

      tr.innerHTML = `
        <td><strong>${rankBadge}</strong></td>
        <td><strong>${escapeHtml(p.nama_siswa)}</strong></td>
        <td>${escapeHtml(p.kelas)}</td>
        <td><span class="score-badge-sm">${p.skor} / ${p.total_soal || 16}</span></td>
        <td>⏱️ ${formatTime(p.durasi_detik)}</td>
      `;
      tbodyContainer.appendChild(tr);
    });
  }
}

function renderCategoryBreakdown() {
  breakdownGrid.innerHTML = '';
  Object.keys(categoryTotals).forEach(catName => {
    const obtained = categoryScores[catName] || 0;
    const max = categoryTotals[catName];

    const card = document.createElement('div');
    card.className = 'breakdown-card';
    card.innerHTML = `
      <div class="breakdown-card-name">${escapeHtml(catName)}</div>
      <div class="breakdown-card-score">${obtained} / ${max} Benar</div>
    `;
    breakdownGrid.appendChild(card);
  });
}

// ==========================================
// 9. LOCAL STORAGE & UTILITIES
// ==========================================
function saveQuizAttempt(score, total, category) {
  try {
    const history = getQuizHistory();
    history.push({
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      skor: score,
      total: total,
      kategori: category
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Gagal menyimpan ke localStorage:', error);
  }
}

function getQuizHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function updateHighScoreDisplay() {
  const history = getQuizHistory();
  if (history.length === 0) {
    highScoreText.textContent = 'Skor terbaikmu: Belum ada rekor';
    return;
  }
  const maxScore = Math.max(...history.map(item => item.skor));
  highScoreText.textContent = `Skor terbaikmu: ${maxScore} / ${questionsData.length} Jawaban Benar`;
}

function restartQuiz() {
  if (isSoloMode) {
    startSoloQuiz();
  } else if (currentRoom && currentStudent) {
    startQuizSession(false);
  } else {
    backToLobby();
  }
}

function copyPinToClipboard() {
  if (!currentRoom || !currentRoom.game_pin) return;
  navigator.clipboard.writeText(currentRoom.game_pin).then(() => {
    alert(`Game PIN ${currentRoom.game_pin} telah disalin!`);
  }).catch(() => {
    alert(`Game PIN: ${currentRoom.game_pin}`);
  });
}

function unsubscribeChannels() {
  if (hostRealtimeChannel && supabaseClient) {
    supabaseClient.removeChannel(hostRealtimeChannel);
    hostRealtimeChannel = null;
  }
  if (playerRealtimeChannel && supabaseClient) {
    supabaseClient.removeChannel(playerRealtimeChannel);
    playerRealtimeChannel = null;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
