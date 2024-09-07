import {
  addWalletAddress,
  addUsername,
  updateMaxScore,
  getLeaderboard,
} from "./arweave-helpers.js";

document.addEventListener("DOMContentLoaded", () => {
  const homepage = document.getElementById("homepage");
  const gameContainer = document.getElementById("gameContainer");
  const connectWalletScreen = document.getElementById("connectWalletScreen");
  const usernameScreen = document.getElementById("usernameScreen");
  const menuScreen = document.getElementById("menuScreen");
  const leaderboardScreen = document.getElementById("leaderboardScreen");
  const usernameInput = document.getElementById("usernameInput");
  const submitUsernameBtn = document.getElementById("submitUsername");
  const letsPlayBtn = document.getElementById("letsPlay");
  const showLeaderboardBtn = document.getElementById("showLeaderboard");
  const backToMenuBtn = document.getElementById("backToMenu");
  const leaderboardList = document.getElementById("leaderboardList");
  const walletConnection = document.querySelector("arweave-wallet-connection");
  const gameBoard = document.getElementById("game-board");
  const scoreDisplay = document.getElementById("score");
  const leftBtn = document.getElementById("leftBtn");
  const downBtn = document.getElementById("downBtn");
  const rightBtn = document.getElementById("rightBtn");

  let username = "";

  // Constants
  const BOARD_WIDTH = 7;
  const BOARD_HEIGHT = 10;
  const LETTERS = "AAAEEIOOPRSWLLMMCUU$";
  const INITIAL_GAME_SPEED = 700;
  const SPEED_INCREASE_FACTOR = 0.9;
  const LETTERS_PER_SPEED_INCREASE = 3;

  // Game state variables
  let currentGameSpeed = INITIAL_GAME_SPEED;
  let lettersPlaced = 0;
  let board = [];
  let score = 0;
  let currentLetter = "";
  let currentPosition = { x: 0, y: 0 };
  let gameLoop;

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

  const leaderboardData = [
    { username: "Player1", score: 1000 },
    { username: "Player2", score: 900 },
    { username: "Player3", score: 800 },
    { username: "Player4", score: 700 },
    { username: "Player5", score: 600 },
  ];

  walletConnection.addEventListener("walletConnected", async (event) => {
    console.log("Wallet connected:", event.detail);
    connectWalletScreen.style.display = "none";

    try {
      // Add wallet address to Arweave
      await addWalletAddress(walletConnection, event.detail);
      console.log("Wallet address added to Arweave");

      // Perform dry run to get user data
      const dryRunResult = await walletConnection.dryRunArweave([
        { name: "Action", value: "GetUserData" },
        { name: "Wallet-Address", value: walletConnection.walletAddress },
      ]);

      if (dryRunResult.Messages && dryRunResult.Messages.length > 0) {
        const userData = JSON.parse(dryRunResult.Messages[0].Data);
        if (userData.username) {
          username = userData.username;
          console.log("Existing username found:", username);
          menuScreen.style.display = "block";
        } else {
          console.log("No existing username found");
          usernameScreen.style.display = "block";
        }
      } else {
        console.log("No user data found");
        usernameScreen.style.display = "block";
      }
    } catch (error) {
      console.error("Error during wallet connection process:", error);
      alert(
        "An error occurred while setting up your account. Please try again.",
      );
      usernameScreen.style.display = "block";
    }
  });

  submitUsernameBtn.addEventListener("click", async () => {
    if (!username) {
      username = usernameInput.value.trim();
    }

    if (username) {
      try {
        await addUsername(
          walletConnection,
          walletConnection.walletAddress,
          username,
        );
        console.log("Username added to Arweave");
        usernameScreen.style.display = "none";
        menuScreen.style.display = "block";
      } catch (error) {
        console.error("Error adding username:", error);
        alert("Failed to set username. Please try again.");
      }
    } else {
      alert("Please enter a valid username.");
    }
  });

  letsPlayBtn.addEventListener("click", startGame);
  showLeaderboardBtn.addEventListener("click", showLeaderboard);
  backToMenuBtn.addEventListener("click", () => {
    leaderboardScreen.style.display = "none";
    menuScreen.style.display = "block";
  });

  leftBtn.addEventListener("click", () => moveLetter("left"));
  downBtn.addEventListener("click", () => moveLetter("down"));
  rightBtn.addEventListener("click", () => moveLetter("right"));

  function startGame() {
    if (walletConnection.walletAddress && username) {
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
    } else {
      alert(
        "Please connect your wallet and ensure you have a username before playing!",
      );
    }
  }

  async function showLeaderboard() {
    try {
      const leaderboardData = await getLeaderboard(walletConnection, 10); // Get top 10
      console.log("Leaderboard data:", leaderboardData);

      // You can also stringify the data for a more readable console output
      console.log(
        "Leaderboard data (stringified):",
        JSON.stringify(leaderboardData, null, 2),
      );

      // For now, we'll just show an alert that the leaderboard was fetched
      alert("Leaderboard data fetched. Check the console for details.");

      // TODO: Implement the UI for displaying the leaderboard
      leaderboardScreen.style.display = "block";
      menuScreen.style.display = "none";
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      alert("Failed to fetch leaderboard. Please try again.");
    }
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
    if (currentLetter && currentPosition.y >= 0) {
      const currentCell =
        gameBoard.children[currentPosition.y * BOARD_WIDTH + currentPosition.x];
      currentCell.textContent = currentLetter;
    }
  }

  function spawnLetter() {
    currentLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    currentPosition = { x: Math.floor(BOARD_WIDTH / 2), y: -1 }; // Start above the visible board
    if (!canMoveTo(currentPosition.x, currentPosition.y + 1)) {
      endGame();
    }
  }

  function updateGame() {
    if (canMoveTo(currentPosition.x, currentPosition.y + 1)) {
      currentPosition.y++;
    } else {
      if (currentPosition.y >= 0) {
        // Only place the letter if it's within the visible board
        placeLetter();
        if (!isProcessingWords) {
          checkWords();
        }
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

  async function endGame() {
    clearInterval(gameLoop);
    document.removeEventListener("keydown", handleKeyPress);
    window.removeEventListener("resize", resizeBoard);

    try {
      // Perform dry run to check if the score is a new high score
      const dryRunResult = await walletConnection.dryRunArweave([
        { name: "Action", value: "UpdateMaxScore" },
        { name: "Wallet-Address", value: walletConnection.walletAddress },
        { name: "Score", value: score.toString() },
      ]);

      let isNewHighScore = false;
      if (dryRunResult.Messages && dryRunResult.Messages.length > 0) {
        const result = JSON.parse(dryRunResult.Messages[0].Data);
        isNewHighScore = result.newHighScore === true;
      }

      // Update the max score in Arweave
      await updateMaxScore(
        walletConnection,
        walletConnection.walletAddress,
        score,
      );

      // Show game over message
      if (isNewHighScore) {
        alert(`Game Over! Your score is ${score}. New High Score!`);
      } else {
        alert(`Game Over! Your score is ${score}.`);
      }

      console.log("Max score updated in Arweave");
    } catch (error) {
      console.error("Error updating max score:", error);
      alert(`Game Over! Your score is ${score}. Failed to update high score.`);
    }

    currentGameSpeed = INITIAL_GAME_SPEED;
    lettersPlaced = 0;

    // Reset the game state or navigate back to the menu
    // For example:
    // resetGame();
    // or
    // showMenuScreen();
  }
});
