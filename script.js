// Wordle game UI logic:
// - pick a secret word
// - validate each guess
// - color the tiles according to Wordle rules
// - show status messages for wins, losses, and invalid input

let VALID_WORDS = [];
let POSSIBLE_ANSWERS = [];

// DOM references for the HTML elements used by the game
const board = document.getElementById('board');
const controls = document.querySelector('.controls');
const input = document.getElementById('guess-input');
const statusEl = document.getElementById('status');
const guessBtn = document.getElementById('guess-btn');
const resetBtn = document.getElementById('reset-btn');

// Game state
// secretWord: the hidden answer chosen for the current round
// guesses: stores the guesses entered by the player
// currentRow: the row currently being filled
// gameOver: stops input when the round ends
// wordsReady: tells us whether the word lists finished loading
let secretWord = '';
let guesses = [];
let currentRow = 0;
let gameOver = false;
let wordsReady = false;

/**
 * Cleans a text file of words into a deduplicated list of lowercase 5-letter words.
 * - removes extra whitespace
 * - lowercases everything
 * - filters out anything that is not exactly 5 letters
 */
function parseWords(text) {
  return [...new Set(
    text
      .split(/\s+/)
      .map((word) => word.toLowerCase())
      .filter((word) => /^[a-z]{5}$/.test(word))
  )];
}

// Loads both word lists from disk:
// - VALID_WORDS.txt: all valid guesses
// - POSSIBLE_ANSWERS.txt: possible secret words
async function loadWords() {
  const [validResponse, answersResponse] = await Promise.all([
    fetch('VALID_WORDS.txt'),
    fetch('POSSIBLE_ANSWERS.txt'),
  ]);

  // Stop if either file failed to load
  if (!validResponse.ok || !answersResponse.ok) {
    setStatus('Could not load the word list.');
    return;
  }

  // Parse the data once it arrives
  VALID_WORDS = parseWords(await validResponse.text());
  POSSIBLE_ANSWERS = parseWords(await answersResponse.text());

  // Guard against empty files
  if (!VALID_WORDS.length || !POSSIBLE_ANSWERS.length) {
    setStatus('The word list is empty.');
    return;
  }

  wordsReady = true;
  resetGame();
}

// Choose a random secret word from the answer list
function chooseWord() {
  secretWord = POSSIBLE_ANSWERS[Math.floor(Math.random() * POSSIBLE_ANSWERS.length)];
}

// Build the 6x5 Wordle board
// Each row contains 5 tiles, and there are 6 rows total
function buildBoard() {
  board.innerHTML = '';

  for (let row = 0; row < 6; row++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'row';

    for (let col = 0; col < 5; col++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      rowEl.appendChild(tile);
    }

    board.appendChild(rowEl);
  }
}

// Evaluate a guess using Wordle coloring rules:
// - "correct" = right letter, right spot
// - "present" = letter exists but in the wrong spot
// - "absent" = the letter is not in the word
function evaluateGuess(secret, guess) {
  const result = Array(5).fill('absent');
  const remaining = {};

  // First pass: mark exact matches and count leftover letters
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) {
      result[i] = 'correct';
    } else {
      remaining[secret[i]] = (remaining[secret[i]] || 0) + 1;
    }
  }

  // Second pass: mark letters that are in the word but not in the correct place
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue;

    const letter = guess[i];
    if (remaining[letter] > 0) {
      result[i] = 'present';
      remaining[letter] -= 1;
    }
  }

  return result;
}

// Draw each submitted guess onto the board and give each tile the correct color
function renderBoard() {
  const rows = board.children;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const tiles = rows[rowIndex].children;
    const guess = guesses[rowIndex] || '';
    const result = evaluateGuess(secretWord, guess);

    for (let i = 0; i < 5; i++) {
      const tile = tiles[i];
      const letter = guess[i] || '';

      tile.textContent = letter;
      tile.classList.remove('filled', 'correct', 'present', 'absent');

      if (letter) {
        tile.classList.add('filled');
        tile.classList.add(result[i]);
      }
    }
  }
}

// Update the status text under the board
function setStatus(message) {
  statusEl.textContent = message;
}

// Called when the player wins.
// Locks the game and shows a success message with the number of tries used.
function finishWin() {
  gameOver = true;
  controls.classList.add('game-won');
  statusEl.classList.add('win');
  statusEl.textContent = `You guessed it in ${currentRow + 1} ${currentRow === 0 ? 'try' : 'tries'}!`;
}

// Reset the game state for a fresh round
function resetGame() {
  chooseWord();
  guesses = Array(6).fill('');
  currentRow = 0;
  gameOver = false;
  input.value = '';
  controls.classList.remove('game-won');
  statusEl.classList.remove('win');
  buildBoard();
  setStatus('Start guessing!');
}

// Validate the player's input before accepting the guess
function submitGuess() {
  if (!wordsReady || gameOver) return;

  const guess = input.value.trim().toLowerCase();

  // Must be exactly 5 letters
  if (!/^[a-z]{5}$/.test(guess)) {
    setStatus('Enter a valid 5-letter word.');
    return;
  }

  // Must be a real word from the valid list
  if (!VALID_WORDS.includes(guess)) {
    setStatus('That word is not in the list.');
    return;
  }

  // Store the valid guess and redraw the board
  guesses[currentRow] = guess;
  renderBoard();
  input.value = '';

  // Winning condition
  if (guess === secretWord) {
    finishWin();
    return;
  }

  // Move to the next row
  currentRow += 1;

  // Lose condition after 6 attempts
  if (currentRow >= 6) {
    controls.classList.add('game-won'); // hides the input and submit button
    statusEl.classList.remove('win');    // keeps the message from looking like a win
    setStatus(`Game over! The word was ${secretWord.toUpperCase()}.`);
    gameOver = true;
    return;
  }

  setStatus('Keep going!');
}

// Attach button and keyboard event listeners
guessBtn.addEventListener('click', submitGuess);
resetBtn.addEventListener('click', resetGame);

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    submitGuess();
  }
});

// Start the game only after the word lists are loaded
loadWords().catch(() => {
  setStatus('Could not load the word list.');
});