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
  const BOARD_HEIGHT = 8;
  const LETTERS = "AAAEEEIIOOPRSWLLMMCUUU$";
  const INITIAL_GAME_SPEED = 700; // Start slower, 800ms
  const SPEED_INCREASE_FACTOR = 0.9; // Decrease time by 5% each speed up
  const LETTERS_PER_SPEED_INCREASE = 4;
  let currentGameSpeed = INITIAL_GAME_SPEED;
  let lettersPlaced = 0;

  const WORDS = [
    "CU",
    "SU",
    "MU",
    "ARWEAVE",
    "AO",
    "$AR",
    "AI",
    "PARALLEL",
    "PERMA",
  ];

  const directions = [
    [0, 1], // down
    [1, 0], // right
    [0, -1], // up
    [-1, 0], // left
    [1, 1], // down-right
    [-1, 1], // down-left
    [1, -1], // up-right
    [-1, -1], // up-left
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
    displayWordList(); // Add this line
    currentGameSpeed = INITIAL_GAME_SPEED;
    lettersPlaced = 0;
    gameLoop = setInterval(updateGame, currentGameSpeed);
    document.addEventListener("keydown", handleKeyPress);
    window.addEventListener("resize", resizeBoard);
  }

  function displayWordList() {
    const wordListElement = document.getElementById("word-list");
    wordListElement.innerHTML = "";
    WORDS.forEach((word) => {
      const wordElement = document.createElement("span");
      wordElement.textContent = word;
      wordElement.classList.add("word-item");
      wordListElement.appendChild(wordElement);
    });
  }

  function initializeBoard() {
    board = Array(BOARD_HEIGHT)
      .fill()
      .map(() => Array(BOARD_WIDTH).fill(""));
  }

  function resizeBoard() {
    gameBoard.style.gridTemplateColumns = `repeat(${BOARD_WIDTH}, 1fr)`;
    gameBoard.style.gridTemplateRows = `repeat(${BOARD_HEIGHT}, 1fr)`;
  }

  function drawBoard() {
    console.log("Drawing board");
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const index = y * BOARD_WIDTH + x;
        let cell = gameBoard.children[index];
        if (!cell) {
          cell = document.createElement("div");
          cell.classList.add("cell");
          gameBoard.appendChild(cell);
        }
        cell.textContent = board[y][x] || " ";
        // Preserve the flash class if it exists
        if (!cell.classList.contains("flash")) {
          cell.className = "cell"; // Reset classes except 'flash'
        }
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
      checkWords();
      spawnLetter();
    }
    drawBoard();
  }

  function canMoveTo(x, y) {
    return (
      x >= 0 &&
      x < BOARD_WIDTH &&
      y < BOARD_HEIGHT &&
      (y < 0 || board[y][x] === "")
    );
  }

  function placeLetter() {
    board[currentPosition.y][currentPosition.x] = currentLetter;
    console.log(
      `Placed letter ${currentLetter} at (${currentPosition.x},${currentPosition.y})`,
    );
    lettersPlaced++;
    if (lettersPlaced % LETTERS_PER_SPEED_INCREASE === 0) {
      increaseSpeed();
    }
  }

  function increaseSpeed() {
    currentGameSpeed *= SPEED_INCREASE_FACTOR;
    clearInterval(gameLoop);
    gameLoop = setInterval(updateGame, currentGameSpeed);
    console.log(`Game speed increased to ${currentGameSpeed.toFixed(2)}ms`);
  }

  function checkWords() {
    let wordsFound = [];

    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        directions.forEach(([dx, dy]) => {
          WORDS.forEach((word) => {
            if (checkWordAt(x, y, word, dx, dy)) {
              wordsFound.push({ x, y, word, dx, dy });
              console.log(`Word found: ${word} at (${x},${y})`);
            }
          });
        });
      }
    }

    console.log(`Total words found: ${wordsFound.length}`);

    if (wordsFound.length > 0) {
      wordsFound.forEach(({ x, y, word, dx, dy }) => {
        console.log(`Flashing word: ${word}`);
        flashWord(x, y, word.length, dx, dy);
        highlightWord(word);
      });

      // Delay clearing words until after both flash animations are complete
      setTimeout(() => {
        wordsFound.forEach(({ x, y, word, dx, dy }) => {
          console.log(`Clearing word: ${word}`);
          clearWord(x, y, word.length, dx, dy);
          updateScore(word.length);
        });
        applyGravity();
        drawBoard();

        // Check for new words after a short delay
        setTimeout(() => {
          checkWords();
        }, 300);
      }, 600); // Match this to the total duration of both flash animations
    }
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
      if (board[y + dy * i][x + dx * i] !== word[i]) return false;
    }
    return true;
  }

  function flashWord(x, y, length, dx, dy) {
    const cells = gameBoard.children;
    const flashClass = length >= 4 ? "flash-special" : "flash";
    for (let i = 0; i < length; i++) {
      const index = (y + dy * i) * BOARD_WIDTH + (x + dx * i);
      console.log(`Flashing cell at index: ${index}`);
      if (cells[index]) {
        const letter = cells[index].textContent;
        cells[index].classList.add(flashClass);
        cells[index].textContent = letter;

        // Remove the flash class after both animations are complete
        setTimeout(() => {
          cells[index].classList.remove(flashClass);
        }, 600); // 2 * 300ms (duration of two animations)
      } else {
        console.error(`Cell at index ${index} not found`);
      }
    }
  }

  function highlightWord(word) {
    const wordItems = document.querySelectorAll(".word-item");
    wordItems.forEach((item) => {
      if (item.textContent === word) {
        item.style.backgroundColor = "#90EE90"; // Light green
        setTimeout(() => {
          item.style.backgroundColor = ""; // Reset after 1 second
        }, 1000);
      }
    });
  }

  function clearWord(x, y, length, dx, dy) {
    for (let i = 0; i < length; i++) {
      board[y + dy * i][x + dx * i] = "";
    }
  }

  function applyGravity() {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      let emptySpaces = 0;
      for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (board[y][x] === "") {
          emptySpaces++;
        } else if (emptySpaces > 0) {
          board[y + emptySpaces][x] = board[y][x];
          board[y][x] = "";
        }
      }
    }
    drawBoard();
  }

  function updateScore(wordLength) {
    let points;
    if (wordLength >= 4) {
      points = wordLength * 5;
    } else {
      points = wordLength;
    }
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
        checkWords();
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
