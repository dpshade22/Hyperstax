import {
  addWalletAddress,
  addUsername,
  updateMaxScore,
  dryRunGetUserData,
  getLeaderboard,
} from "./arweave-helpers.js";

import { PixelatedButton } from "./pixelated-button.js";

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
  const walletConnection = document.querySelector("arweave-wallet-connection");
  const gameBoard = document.getElementById("game-board");
  const scoreDisplay = document.getElementById("score");
  const leftBtn = document.getElementById("leftBtn");
  const downBtn = document.getElementById("downBtn");
  const rightBtn = document.getElementById("rightBtn");
  const backToMenuFromModalBtn = document.getElementById("backToMenuFromModal");
  const finalScoreElement = document.getElementById("finalScore");
  const highScoreMessageElement = document.getElementById("highScoreMessage");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const modalContent = document.querySelector(".modal-content");

  function scrollToBottom() {
    // if (window.innerWidth <= 768) {
    //   // Check if it's a mobile device
    //   const gameBoard = document.getElementById("game-board");
    //   gameBoard.scrollTop = gameBoard.scrollHeight;
    // }
  }

  function showModalLoading() {
    modalLoadingIndicator.style.display = "flex";
    modalContent.classList.add("loading");
  }

  function hideModalLoading() {
    modalLoadingIndicator.style.display = "none";
    modalContent.classList.remove("loading");
  }

  function hideModal() {
    const modal = document.getElementById("gameOverModal");
    modal.style.opacity = "0";
    setTimeout(() => {
      modal.style.display = "none";
    }, 1000); // Wait for the fade-out transition to complete
  }

  function showLoading() {
    loadingIndicator.style.display = "flex";
  }

  function hideLoading() {
    loadingIndicator.style.display = "none";
  }

  let username = "";

  // Constants
  const BOARD_WIDTH = 7;
  const BOARD_HEIGHT = 10;
  const LETTERS = "AAAEEIOOPRSWVLLMMCUU$";
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
  let wordsToProcess;

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

  walletConnection.addEventListener("walletConnected", async (event) => {
    showLoading();

    console.log("Wallet connected:", event.detail);
    connectWalletScreen.style.display = "none";

    try {
      // Add wallet address to Arweave
      await addWalletAddress(walletConnection, event.detail);
      console.log("Wallet address added to Arweave");

      // Timeout for 1.5 seconds
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Perform dry run to get user data
      const dryRunResult = await walletConnection.dryRunArweave([
        { name: "Action", value: "GetUserData" },
        { name: "Wallet-Address", value: walletConnection.walletAddress },
      ]);

      if (dryRunResult.Messages && dryRunResult.Messages.length > 0) {
        const userData = JSON.parse(dryRunResult.Messages[0].Data);
        if (userData.username) {
          currentUsername = userData.username;
          console.log("Existing username found:", currentUsername);
          menuScreen.style.display = "block";
          updateUserInfo();
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
    } finally {
      hideLoading();
    }
  });

  submitUsernameBtn.addEventListener("click", async () => {
    currentUsername = usernameInput.value.trim();

    if (currentUsername) {
      showLoading();

      try {
        await addUsername(
          walletConnection,
          walletConnection.walletAddress,
          currentUsername,
        );
        console.log("Username added to Arweave");
        usernameScreen.style.display = "none";
        menuScreen.style.display = "block";
        updateUserInfo(); // Call this function here
      } catch (error) {
        console.error("Error adding username:", error);
        alert("Failed to set username. Please try again.");
      } finally {
        hideLoading();
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
    const title = document.querySelector(".game-title");
    title.style.display = "block";
  });
  backToMenuFromModalBtn.addEventListener("click", backToMenuFromModal);

  leftBtn.addEventListener("click", () => moveLetter("left"));
  downBtn.addEventListener("click", () => moveLetter("down"));
  rightBtn.addEventListener("click", () => moveLetter("right"));
  playAgainBtn.addEventListener("click", resetGame);

  function startGame() {
    console.log(currentUsername);
    if (walletConnection.walletAddress && currentUsername) {
      homepage.style.display = "none";
      gameContainer.style.display = "flex";
      clearGameState();
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

  function updateUserInfo() {
    const userInfoElement = document.getElementById("userInfo");
    if (walletConnection.walletAddress && currentUsername) {
      const shortWallet = walletConnection.walletAddress.slice(-4);
      userInfoElement.textContent = `${currentUsername}#${shortWallet}`;
      userInfoElement.style.display = "block";
    } else {
      userInfoElement.style.display = "none";
    }
  }

  async function showLeaderboard() {
    showLoading();

    try {
      const leaderboardData = await getLeaderboard(walletConnection, 10);
      const title = document.querySelector(".game-title");
      title.style.display = "none"; // Hide the title
      console.log("Leaderboard data:", leaderboardData);

      const leaderboardList = document.getElementById("leaderboardList");
      leaderboardList.innerHTML = ""; // Clear previous entries

      if (leaderboardData.Messages && leaderboardData.Messages.length > 0) {
        const leaderboard = JSON.parse(
          leaderboardData.Messages[0].Data,
        ).leaderboard;

        leaderboard.forEach((entry, index) => {
          const shortWallet = entry.walletAddress.slice(-4); // Get last 4 characters of wallet address

          const displayName =
            entry.username != "Unknown"
              ? `${entry.username}<span class="wallet-suffix">#${shortWallet}</span>`
              : `<span class="wallet-suffix">#${entry.walletAddress.slice(-12)}</span>`;

          const item = document.createElement("div");
          item.className = "leaderboard-item";
          item.innerHTML = `
            <span class="place">#${index + 1}</span>
            <span class="username">${displayName}</span>
            <span class="score">${entry.maxScore}</span>
          `;
          leaderboardList.appendChild(item);
        });
      } else {
        leaderboardList.innerHTML = "<p>No leaderboard data available.</p>";
      }

      leaderboardScreen.style.display = "flex";
      menuScreen.style.display = "none";
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      alert("Failed to fetch leaderboard. Please try again.");
    } finally {
      hideLoading();
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

    scrollToBottom();
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
    scrollToBottom();
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
    wordsToProcess = uniqueWordsFound;
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

      const darkRed = "#F0544F";
      const darkYellow = "#FFB637";
      const darkGreen = "#0B6E4F";
      const special = "#CEEDDB";

      const colors = isSpecial
        ? [darkRed, darkYellow, darkGreen, special]
        : [darkRed, darkYellow, darkGreen];

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
            cells[index].style.color = "#ffffff"; // Keep text color white for contrast
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
              cells[index].style.backgroundColor = "#1f2225"; // Reset to original background color
              cells[index].style.color = "#ffffff"; // Reset to original text color
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
        item.style.backgroundColor = "#0B6E4F";
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
    scoreDisplay.textContent = `${score}`;
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

  function backToMenuFromModal() {
    hideModal();
    const gameContainer = document.getElementById("gameContainer");
    const homepage = document.getElementById("homepage");
    const menuScreen = document.getElementById("menuScreen");
    const title = document.querySelector(".game-title");

    // Fade out game container
    gameContainer.style.opacity = "0";
    gameContainer.style.transition = "opacity 1s ease";

    setTimeout(() => {
      gameContainer.style.display = "none";
      gameContainer.classList.remove("blur-background");

      // Prepare homepage and menu screen
      homepage.style.opacity = "0";
      homepage.style.display = "flex";
      menuScreen.style.display = "block";
      title.style.display = "block"; // Show the title

      // Trigger reflow
      void homepage.offsetWidth;

      // Fade in homepage
      homepage.style.transition = "opacity 0.5s ease";
      homepage.style.opacity = "1";

      updateUserInfo();

      // Reset game container styles for next game
      gameContainer.style.transition = "";
      gameContainer.style.opacity = "1";
    }, 500); // This should match the transition duration
  }

  async function endGame() {
    clearInterval(gameLoop);
    document.removeEventListener("keydown", handleKeyPress);
    window.removeEventListener("resize", resizeBoard);

    if (isProcessingWords) await processFoundWords(wordsToProcess);

    // Show game over screen with fade-in
    const gameOverScreen = document.getElementById("gameOverScreen");
    gameOverScreen.style.display = "flex";
    document.getElementById("gameContainer").classList.add("blur-background");

    // Trigger reflow to ensure the transition applies
    void gameOverScreen.offsetWidth;
    gameOverScreen.style.opacity = "1";

    // Wait for 4 seconds (1s fade-in + 3s display time) before transitioning to modal
    setTimeout(() => {
      // Fade out game over screen and score display
      gameOverScreen.style.opacity = "0";

      // After fade-out, show modal
      setTimeout(() => {
        gameOverScreen.style.display = "none";
        showModal();
      }, 1000);
    }, 4000);
  }

  function showModal() {
    const modal = document.getElementById("gameOverModal");
    modal.style.display = "flex";
    modal.style.opacity = "1";

    updateFinalScore();
  }

  async function updateFinalScore() {
    try {
      showModalLoading();

      // Perform dry run to get user data including current max score
      const dryRunResult = await dryRunGetUserData(
        walletConnection,
        walletConnection.walletAddress,
      );

      let currentMaxScore = 0;
      if (dryRunResult.Messages && dryRunResult.Messages.length > 0) {
        const userData = JSON.parse(dryRunResult.Messages[0].Data);
        currentMaxScore = userData.maxScore || 0;
      }

      if (score > currentMaxScore) {
        await updateMaxScore(
          walletConnection,
          walletConnection.walletAddress,
          score,
        );
        highScoreMessageElement.textContent = "New High Score!";
        document.getElementById("previousHighScore").textContent =
          `Previous high score: ${currentMaxScore}`;
      } else if (score === currentMaxScore) {
        highScoreMessageElement.textContent = "You matched your high score!";
        document.getElementById("previousHighScore").textContent =
          `High score: ${currentMaxScore}`;
      } else {
        highScoreMessageElement.textContent =
          "Not quite a high score this time.";
        document.getElementById("previousHighScore").textContent =
          `Your high score: ${currentMaxScore}`;
      }

      finalScoreElement.textContent = `Score: ${score}`;
    } catch (error) {
      console.error("Error checking/updating max score:", error);
      highScoreMessageElement.textContent = "Failed to check high score.";
    } finally {
      hideModalLoading();
    }
  }

  function clearGameState() {
    // Reset UI
    scoreDisplay.textContent = `0`;

    // Clear the game board display
    gameBoard.innerHTML = "";

    // Reset game state variables
    score = 0;
    currentGameSpeed = INITIAL_GAME_SPEED;
    lettersPlaced = 0;
    currentLetter = "";
    currentPosition = { x: 0, y: 0 };

    console.log("Clearing game state");
  }

  function resetGame() {
    hideModal();
    document
      .getElementById("gameContainer")
      .classList.remove("blur-background");
    clearGameState();

    // Clear any existing game loop
    clearInterval(gameLoop);

    // Reset the board
    initializeBoard();

    // Redraw the empty board
    drawBoard();

    // Spawn a new letter
    spawnLetter();

    // Start a new game loop
    gameLoop = setInterval(updateGame, currentGameSpeed);

    // Re-add event listeners
    document.addEventListener("keydown", handleKeyPress);
    window.addEventListener("resize", resizeBoard);

    // Make sure the game container is visible and not blurred
    gameContainer.style.display = "flex";
    gameContainer.classList.remove("blur-background");

    updateUserInfo();
  }
});
