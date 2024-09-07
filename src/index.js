document.addEventListener("DOMContentLoaded", () => {
  const startGameBtn = document.getElementById("startGame");
  const homepage = document.getElementById("homepage");
  const gameContainer = document.getElementById("gameContainer");
  const gameBoard = document.getElementById("game-board");
  const scoreDisplay = document.getElementById("score");
  const leftBtn = document.getElementById("leftBtn");
  const downBtn = document.getElementById("downBtn");
  const rightBtn = document.getElementById("rightBtn");

  const BOARD_WIDTH = 7;
  const BOARD_HEIGHT = 10;
  const LETTERS = "AAAEEEIOOPRSWLLMMCUUU$";
  const INITIAL_GAME_SPEED = 700;
  const SPEED_INCREASE_FACTOR = 0.9;
  const LETTERS_PER_SPEED_INCREASE = 4;
  let currentGameSpeed = INITIAL_GAME_SPEED;
  let lettersPlaced = 0;

  const WORDS = [
    "ARWEAVE",
    "PARALLEL",
    "PERMA",
    "LUA",
    "CU",
    "SU",
    "MU",
    "AO",
    "AI",
    "$AR",
  ];

  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];

  let board = [];
  let score = 0;
  let currentLetter = "";
  let currentPosition = { x: 0, y: 0 };
  let gameLoop;

  startGameBtn.addEventListener("click", startGame);
  leftBtn.addEventListener("click", () => moveLetter("left"));
  downBtn.addEventListener("click", () => moveLetter("down"));
  rightBtn.addEventListener("click", () => moveLetter("right"));

  function startGame() {
    homepage.style.display = "none";
    gameContainer.style.display = "flex";
    initializeBoard();
    resizeBoard();
    drawBoard();
    spawnLetter();
    displayWordList();
    currentGameSpeed = INITIAL_GAME_SPEED;
    lettersPlaced = 0;
    gameLoop = setInterval(updateGame, currentGameSpeed);
    document.addEventListener("keydown", handleKeyPress);
    window.addEventListener("resize", resizeBoard);
  }

  function displayWordList() {
    const wordListElement = document.getElementById("word-list");
    wordListElement.innerHTML = `
      <div id="jackpot-words"></div>
      <div id="regular-words"></div>
    `;

    const jackpotWordsElement = document.getElementById("jackpot-words");
    const regularWordsElement = document.getElementById("regular-words");

    const jackpotWords = WORDS.filter((word) => word.length >= 4);
    const regularWords = WORDS.filter((word) => word.length < 4);

    jackpotWords.sort((a, b) => b.length - a.length);

    jackpotWords.forEach((word) => {
      const wordElement = document.createElement("span");
      wordElement.textContent = word;
      wordElement.classList.add("word-item", "jackpot-word");
      jackpotWordsElement.appendChild(wordElement);
    });

    regularWords.forEach((word) => {
      const wordElement = document.createElement("span");
      wordElement.textContent = word;
      wordElement.classList.add("word-item");
      regularWordsElement.appendChild(wordElement);
    });
  }

  function initializeBoard() {
    board = Array(BOARD_HEIGHT)
      .fill()
      .map(() =>
        Array(BOARD_WIDTH)
          .fill()
          .map(() => ({ letter: "", timestamp: 0 })),
      );
  }

  function resizeBoard() {
    gameBoard.style.gridTemplateColumns = `repeat(${BOARD_WIDTH}, 1fr)`;
    gameBoard.style.gridTemplateRows = `repeat(${BOARD_HEIGHT}, 1fr)`;
  }

  function drawBoard() {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const index = y * BOARD_WIDTH + x;
        let cell = gameBoard.children[index];
        if (!cell) {
          cell = document.createElement("div");
          cell.classList.add("cell");
          gameBoard.appendChild(cell);
        }
        cell.textContent = board[y][x].letter || " ";
      }
    }
    if (currentLetter) {
      const currentCell =
        gameBoard.children[currentPosition.y * BOARD_WIDTH + currentPosition.x];
      currentCell.textContent = currentLetter;
    }
  }

  function spawnLetter() {
    currentLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    currentPosition = { x: Math.floor(BOARD_WIDTH / 2), y: 0 };
    if (!canMoveTo(currentPosition.x, currentPosition.y)) {
      endGame();
    }
  }

  function updateGame() {
    if (canMoveTo(currentPosition.x, currentPosition.y + 1)) {
      currentPosition.y++;
    } else {
      placeLetter();
      if (!isProcessingWords) {
        checkWords();
      }
      spawnLetter();
    }
    drawBoard();
  }

  function canMoveTo(x, y) {
    return (
      x >= 0 &&
      x < BOARD_WIDTH &&
      y < BOARD_HEIGHT &&
      (y < 0 || board[y][x].letter === "")
    );
  }

  function placeLetter() {
    board[currentPosition.y][currentPosition.x] = {
      letter: currentLetter,
      timestamp: Date.now(),
    };
    lettersPlaced++;
    if (lettersPlaced % LETTERS_PER_SPEED_INCREASE === 0) {
      increaseSpeed();
    }
  }

  function increaseSpeed() {
    currentGameSpeed *= SPEED_INCREASE_FACTOR;
    currentGameSpeed = Math.max(currentGameSpeed, 300);
    clearInterval(gameLoop);
    gameLoop = setInterval(updateGame, currentGameSpeed);
  }

  let isProcessingWords = false;

  function checkWords() {
    if (isProcessingWords) return;
    isProcessingWords = true;

    let wordsFound = new Set();
    let clearedCells = new Set();

    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (clearedCells.has(`${x},${y}`)) continue;
        directions.forEach(([dx, dy]) => {
          WORDS.forEach((word) => {
            if (checkWordAt(x, y, word, dx, dy)) {
              wordsFound.add(JSON.stringify({ x, y, word, dx, dy }));
              for (let i = 0; i < word.length; i++) {
                clearedCells.add(`${x + dx * i},${y + dy * i}`);
              }
            }
          });
        });
      }
    }

    const uniqueWordsFound = Array.from(wordsFound).map(JSON.parse);

    if (uniqueWordsFound.length > 0) {
      processFoundWords(uniqueWordsFound);
    } else {
      isProcessingWords = false;
    }
  }

  function processFoundWords(wordsFound) {
    const totalWords = wordsFound.length;
    let flashedWordsCount = 0;

    const flashPromises = wordsFound.map(({ x, y, word, dx, dy }) => {
      highlightWord(word);
      return flashWord(x, y, word.length, dx, dy).then(() => {
        flashedWordsCount++;
        if (flashedWordsCount === totalWords) {
          clearAllWords(wordsFound);
          applyGravity();
          drawBoard();
          isProcessingWords = false;
          setTimeout(checkWords, 300);
        }
      });
    });

    return Promise.all(flashPromises);
  }

  function checkWordAt(x, y, word, dx, dy) {
    if (
      x + dx * (word.length - 1) >= BOARD_WIDTH ||
      x + dx * (word.length - 1) < 0 ||
      y + dy * (word.length - 1) >= BOARD_HEIGHT ||
      y + dy * (word.length - 1) < 0
    )
      return false;
    for (let i = 0; i < word.length; i++) {
      if (board[y + dy * i][x + dx * i].letter !== word[i]) return false;
    }
    return true;
  }

  function flashWord(x, y, length, dx, dy) {
    return new Promise((resolve) => {
      const cells = gameBoard.children;
      const isSpecial = length >= 4;

      const lightGreen = "#90EE90";
      const matchingYellow = "#FFFF8D";
      const matchingPurple = "#B19CD9";

      const colors = isSpecial
        ? ["white", matchingYellow, lightGreen, matchingPurple]
        : ["white", matchingYellow, lightGreen];

      let colorIndex = 0;
      let flashCount = 0;
      const totalFlashes = colors.length * 2;

      function flashStep() {
        for (let i = 0; i < length; i++) {
          const cellX = x + dx * i;
          const cellY = y + dy * i;
          const index = cellY * BOARD_WIDTH + cellX;
          if (cells[index]) {
            cells[index].style.backgroundColor = colors[colorIndex];
            cells[index].style.color = "black";
          }
        }

        colorIndex = (colorIndex + 1) % colors.length;
        flashCount++;

        if (flashCount < totalFlashes) {
          setTimeout(flashStep, 150);
        } else {
          for (let i = 0; i < length; i++) {
            const cellX = x + dx * i;
            const cellY = y + dy * i;
            const index = cellY * BOARD_WIDTH + cellX;
            if (cells[index]) {
              cells[index].style.backgroundColor = "";
              cells[index].style.color = "";
            }
          }
          resolve();
        }
      }

      flashStep();
    });
  }

  function highlightWord(word) {
    const wordItems = document.querySelectorAll(".word-item");
    wordItems.forEach((item) => {
      if (item.textContent === word) {
        item.style.backgroundColor = "#90EE90";
        setTimeout(() => {
          item.style.backgroundColor = "";
        }, 1000);
      }
    });
  }

  function clearAllWords(wordsFound) {
    wordsFound.forEach(({ x, y, word, dx, dy }) => {
      clearWord(x, y, word.length, dx, dy);
      updateScore(word.length);
    });
  }

  function clearWord(x, y, length, dx, dy) {
    for (let i = 0; i < length; i++) {
      const cellX = x + dx * i;
      const cellY = y + dy * i;
      board[cellY][cellX] = { letter: "", timestamp: 0 };
    }
  }

  function applyGravity() {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      let emptySpaces = 0;
      for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (board[y][x].letter === "") {
          emptySpaces++;
        } else if (emptySpaces > 0) {
          board[y + emptySpaces][x] = board[y][x];
          board[y][x] = { letter: "", timestamp: 0 };
        }
      }
    }
    drawBoard();
  }

  function updateScore(wordLength) {
    let points = wordLength >= 4 ? wordLength * 5 : wordLength;
    score += points;
    scoreDisplay.textContent = `Score: ${score}`;
  }

  function moveLetter(direction) {
    switch (direction) {
      case "left":
        if (canMoveTo(currentPosition.x - 1, currentPosition.y)) {
          currentPosition.x--;
        }
        break;
      case "right":
        if (canMoveTo(currentPosition.x + 1, currentPosition.y)) {
          currentPosition.x++;
        }
        break;
      case "down":
        while (canMoveTo(currentPosition.x, currentPosition.y + 1)) {
          currentPosition.y++;
        }
        placeLetter();
        if (!isProcessingWords) {
          checkWords();
        }
        spawnLetter();
        break;
    }
    drawBoard();
  }

  function handleKeyPress(e) {
    switch (e.key) {
      case "ArrowLeft":
        moveLetter("left");
        break;
      case "ArrowRight":
        moveLetter("right");
        break;
      case "ArrowDown":
        moveLetter("down");
        break;
    }
  }

  function endGame() {
    clearInterval(gameLoop);
    alert(`Game Over! Your score is ${score}`);
    document.removeEventListener("keydown", handleKeyPress);
    window.removeEventListener("resize", resizeBoard);
    currentGameSpeed = INITIAL_GAME_SPEED;
    lettersPlaced = 0;
  }
});
