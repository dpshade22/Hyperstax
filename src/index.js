import {
  getPlayCount,
  updatePlayCount,
  checkUserHasBazarProfile,
  addUsername,
  updateMaxScore,
  dryRunGetUserData,
  getLeaderboard,
} from "./arweave-helpers.js";

import { PixelatedButton } from "./pixelated-button.js";
import {
  checkWalletAssociation,
  registerWallet,
  createBazarProfile,
} from "./signup.js";

document.addEventListener("DOMContentLoaded", () => {
  const homepage = document.getElementById("homepage");
  const gameContainer = document.getElementById("gameContainer");
  const connectWalletScreen = document.getElementById("connectWalletScreen");
  const menuScreen = document.getElementById("menuScreen");
  const leaderboardScreen = document.getElementById("leaderboardScreen");
  const usernameInput = document.getElementById("usernameInput");
  const submitSignupBtn = document.getElementById("submitSignup");
  const letsPlayBtn = document.getElementById("letsPlay");
  const showLeaderboardBtn = document.getElementById("showLeaderboard");
  const backToMenuBtns = document.querySelectorAll(".backToMenu");
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
  const previewWordsScreen = document.getElementById("previewWordsScreen");
  // const previewWordsBtn = document.getElementById("previewWords");
  const startGameFromPreviewBtn = document.getElementById(
    "startGameFromPreview",
  );

  // const helpIcon = document.getElementById("helpIcon");
  // const helpModal = document.getElementById("helpModal");
  // const downloadKeyfileBtn = document.getElementById("downloadKeyfile");

  // helpIcon.addEventListener("click", showHelpModal);
  // downloadKeyfileBtn.addEventListener("click", downloadKeyfile);

  // helpModal.addEventListener("click", (event) => {
  //   if (event.target === helpModal) {
  //     closeHelpModal();
  //   }
  // });

  // function showHelpModal() {
  //   helpModal.style.display = "flex";
  // }

  // function closeHelpModal() {
  //   helpModal.style.display = "none";
  // }

  const sounds = {};

  function setupSounds() {
    const soundFiles = {
      dropSound: "assets/DropSound.mp3",
      wordMatch: "assets/WordMatch.mp3",
      specialMatch: "assets/SpecialMatch.mp3",
      moveLetter: "assets/MoveLetter.mp3",
    };

    if (typeof Audio !== "undefined") {
      Object.entries(soundFiles).forEach(([name, path]) => {
        sounds[name] = new Audio(path);
        sounds[name].addEventListener("error", (e) => {
          console.error(`Error loading sound ${name}:`, e);
        });

        // Reduce volume of drop sound and move letter sound
        if (name === "dropSound" || name === "moveLetter") {
          sounds[name].volume = 0.25; // Adjust this value as needed (0.0 to 1.0)
        }
      });
    } else {
      console.warn("Audio is not supported in this environment");
    }
  }

  setupSounds();
  function playSound(soundName) {
    if (sounds[soundName] && sounds[soundName].play) {
      // sounds[soundName].currentTime = 0;
      sounds[soundName].play().catch((error) => {
        console.error(`Error playing sound ${soundName}:`, error);
      });
    } else {
      console.warn(`Sound ${soundName} not found or not playable`);
    }
  }

  function showModalLoading() {
    const modalLoadingIndicator = document.getElementById(
      "modalLoadingIndicator",
    );
    const modalContent = document.querySelector(".modal-content");
    modalLoadingIndicator.style.display = "flex";
    modalContent.classList.add("loading");

    // Set a timeout to hide the loading indicator after 30 seconds
    setTimeout(() => {
      hideModalLoading();
    }, 30000);
  }

  function hideModalLoading() {
    const modalLoadingIndicator = document.getElementById(
      "modalLoadingIndicator",
    );
    const modalContent = document.querySelector(".modal-content");
    modalLoadingIndicator.style.display = "none";
    modalContent.classList.remove("loading");
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function hideModal() {
    const modal = document.getElementById("gameOverModal");
    modal.style.opacity = "0";
    setTimeout(() => {
      modal.style.display = "none";
    }, 1000); // Wait for the fade-out transition to complete
  }

  function showLoading(wallet = false) {
    loadingIndicator.style.display = "flex";
    if (wallet)
      document.getElementById("connectingMessage").style.display = "block";
  }

  function hideLoading() {
    loadingIndicator.style.display = "none";
    document.getElementById("connectingMessage").style.display = "none";
  }

  let username = "";

  // Constants
  const BOARD_WIDTH = 7;
  const BOARD_HEIGHT = 10;
  const LETTERS = "AAEIOOPRSWVLMMCUU$";
  const INITIAL_GAME_SPEED = 700;
  const SPEED_INCREASE_FACTOR = 0.85;
  const LETTERS_PER_SPEED_INCREASE = 4;

  // Game state variables
  let currentGameSpeed = INITIAL_GAME_SPEED;
  let lettersPlaced = 0;
  let board = [];
  let score = 0;
  let currentLetter = "";
  let currentPosition = { x: 0, y: 0 };
  let currentUsername;
  let wordsToProcess;
  let isFirstLetter = true;
  let hasSeenPreviewWords = false;
  let userHasBazarProfile = false;
  let processingColumns = new Set();
  let playCountUpdated = false;
  let gameEnded = false;

  const WORDS = [
    "ARWEAVE",
    "PERMA",
    "LUA",
    "CU",
    "SU",
    "MU",
    "AO",
    "AI",
    "$AR",
  ];

  const WORD_DESCRIPTIONS = {
    ARWEAVE:
      "The blockchain-based storage network underneath ao, designed for permanent data storage and accessibility.",
    PARALLEL:
      "Each process within ao can maintain an independent state, allowing an unlimited number of processes to run in parallel. Each process can customize its mechanisms and does not have to be constrained by the limitations of other processes (e.g. block sizes, block time, execution method, consensus, etc.)",
    PERMA:
      "Short for 'permanent' and 'permaweb', indicating the immutable and everlasting nature of data stored on Arweave.",
    LUA: "A lightweight, high-level scripting language used for ao smart contracts.",
    CU: "The CU handles computation, loading binary modules, and managing memory to ensure processes run with current data. It then returns the evaluation results to the MU for further message handling.",
    SU: "The SU ensures messages are properly sequenced and stored on Arweave, maintaining order for consistent replay and verification of message evaluations.",
    MU: "The MU acts as the entry point, receiving external messages and managing process communications. It processes outgoing messages and spawn requests from process outboxes and forwards them to the SU.",
    AO: "Actor Oriented, a hyper-parallel computing environment built on Arweave.",
    AI: "Artificial Intelligence, often integrated with ao for advanced computational tasks.",
    $AR: "The native cryptocurrency token used within the Arweave network.",
  };

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

  const emailInput = document.getElementById("emailInput");

  function validateInputs() {
    console.log("Validating inputs...");

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();

    console.log("Username:", username);
    console.log("Email:", email);

    const usernameField = document.getElementById("usernameInput");
    const emailField = document.getElementById("emailInput");

    const usernameRequired = usernameField.style.display != "none";
    const emailRequired = emailField.style.display != "none";

    console.log("Username field display:", usernameField.style.display);
    console.log("Email field display:", emailField.style.display);
    console.log("Username required:", usernameRequired);
    console.log("Email required:", emailRequired);

    let isValid = true;

    if (usernameRequired) {
      console.log("Validating username...");
      if (username) {
        console.log("Username is valid");
        usernameInput.classList.remove("invalid");
      } else {
        console.log("Username is invalid");
        usernameInput.classList.add("invalid");
        isValid = false;
      }
    }

    if (emailRequired) {
      console.log("Validating email...");
      if (email && isValidEmail(email)) {
        console.log("Email is valid");
        emailInput.classList.remove("invalid");
      } else {
        console.log("Email is invalid");
        emailInput.classList.add("invalid");
        isValid = false;
      }
    }

    console.log("Is form valid:", isValid);
    submitSignupBtn.disabled = !isValid;
    console.log("Submit button disabled:", submitSignupBtn.disabled);

    return isValid;
  }

  usernameInput.addEventListener("input", validateInputs);
  emailInput.addEventListener("input", validateInputs);
  startGameFromPreviewBtn.addEventListener("click", async () => {
    const { playCount, canPlay } = await getPlayCount(
      walletConnection,
      walletConnection.walletAddress,
    );

    if (!canPlay) {
      alert(
        "You have reached the maximum number of plays (3). Thank you for playing!",
      );
      console.log("Back to menu clicked");
      leaderboardScreen.style.display = "none";
      previewWordsScreen.style.display = "none";
      menuScreen.style.display = "block";
      const title = document.querySelector(".game-title");
      title.style.display = "block";
      return;
    }

    if (!hasSeenPreviewWords) {
      showPreviewWords();
    } else {
      const { playCount, canPlay } = await getPlayCount(
        walletConnection,
        walletConnection.walletAddress,
      );
      if (canPlay) {
        startGame();
      } else {
        alert(
          "You have reached the maximum number of plays (3). Thank you for playing!",
        );
      }
      startGame();
    }
  });

  // helpModal.addEventListener("click", (event) => {
  //   if (event.target === helpModal) {
  //     closeHelpModal();
  //   }
  // });

  walletConnection.addEventListener("walletConnected", async (event) => {
    showLoading(true);

    console.log("Wallet connected:", event.detail);
    connectWalletScreen.style.display = "none";

    try {
      // Check if wallet is associated with an email
      const isAssociated = await checkWalletAssociation(event.detail);

      // Perform dry run to get user data (including username)
      const dryRunResult = await dryRunGetUserData(
        walletConnection,
        event.detail,
      );
      let userData = null;
      if (dryRunResult.Messages && dryRunResult.Messages.length > 0) {
        userData = JSON.parse(dryRunResult.Messages[0].Data);
      }

      userHasBazarProfile = await checkUserHasBazarProfile(
        walletConnection,
        walletConnection.walletAddress,
      );

      console.log(
        `User ${userHasBazarProfile ? "has" : "doesn't have"} a Bazar profile`,
      );

      usernameFound =
        userData.username != "Unknown" && userData.username != "undefined";

      if (isAssociated && userData && usernameFound) {
        // User has both email and username
        currentUsername = userData.username;
        console.log("Existing username found:", currentUsername);
        console.log("Arweave Hub associated email found");

        menuScreen.style.display = "block";
        updateUserInfo();
      } else if (!isAssociated && userData && usernameFound) {
        // User has username but no associated email
        currentUsername = userData.username;
        console.log(
          `Username found (${userData.username}), but no associated email`,
        );
        console.log(userData);
        showEmailOnlyScreen();
      } else if (isAssociated && (!userData || !usernameFound)) {
        // User has email but no username
        console.log("No existing username found");
        showUsernameOnlyScreen();
      } else {
        // User has neither email nor username
        console.log("No user data found");
        showFullSignupScreen();
      }
    } catch (error) {
      console.error("Error during wallet connection process:", error);
      alert(
        "An error occurred while setting up your account. Please try again.",
      );
    } finally {
      hideLoading();
    }
  });

  // Update the submit username button event listener
  submitSignupBtn.addEventListener("click", async () => {
    let validation = validateInputs();
    console.log("VALIDATION: ");
    console.log(validation);
    console.log("Submit button clicked");

    if (validation) {
      showLoading();

      try {
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();

        if (emailInput.style.display !== "none") {
          // Register wallet with email
          const success = await registerWallet(
            walletConnection.walletAddress,
            email,
          );
          if (!success) {
            throw new Error("Failed to register wallet");
          }
          console.log("Wallet registered successfully");
        }

        if (usernameInput.style.display !== "none") {
          if (!userHasBazarProfile) {
            // Create Bazar profile
            const profile = {
              DisplayName: username,
              UserName: username.toLowerCase().replace(/\s/g, "_"),
              Description: "I played Hyperstax!",
              CoverImage: null,
              ProfileImage: null,
            };

            const createdProfile = await createBazarProfile(
              walletConnection,
              profile,
            );

            if (!createdProfile) {
              throw new Error("Failed to create Bazar profile");
            }
            console.log("Bazar profile created successfully");
          }
          // Add username to WordStack Process
          await addUsername(
            walletConnection,
            walletConnection.walletAddress,
            username,
          );
          console.log("Username added to Hyperstax Process");

          currentUsername = username;
        }

        document.getElementById("signupScreen").style.display = "none";
        menuScreen.style.display = "block";
        updateUserInfo();
      } catch (error) {
        console.error("Error during signup:", error);
        alert("Failed to complete signup. Please try again.");
      } finally {
        hideLoading();
      }
    }
  });

  letsPlayBtn.addEventListener("click", async () => {
    const { playCount, canPlay } = await getPlayCount(
      walletConnection,
      walletConnection.walletAddress,
    );

    if (!canPlay) {
      alert(
        "You have reached the maximum number of plays (3). Thank you for playing!",
      );
      console.log("Back to menu clicked");
      leaderboardScreen.style.display = "none";
      previewWordsScreen.style.display = "none";
      menuScreen.style.display = "block";
      const title = document.querySelector(".game-title");
      title.style.display = "block";
      return;
    }

    if (!hasSeenPreviewWords) {
      showPreviewWords();
    } else {
      const { playCount, canPlay } = await getPlayCount(
        walletConnection,
        walletConnection.walletAddress,
      );
      if (canPlay) {
        startGame();
      } else {
        alert(
          "You have reached the maximum number of plays (3). Thank you for playing!",
        );
      }
      startGame();
    }
  });
  showLeaderboardBtn.addEventListener("click", showLeaderboard);
  backToMenuBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      console.log("Back to menu clicked");
      leaderboardScreen.style.display = "none";
      previewWordsScreen.style.display = "none";
      menuScreen.style.display = "block";
      const title = document.querySelector(".game-title");
      title.style.display = "block";
    });
  });
  backToMenuFromModalBtn.addEventListener("click", backToMenuFromModal);

  leftBtn.addEventListener("click", () => moveLetter("left"));
  downBtn.addEventListener("click", () => moveLetter("down"));
  rightBtn.addEventListener("click", () => moveLetter("right"));
  playAgainBtn.addEventListener("click", resetGame);

  function adjustHeight() {
    const gameContainer = document.getElementById("gameContainer");
    const windowHeight = window.innerHeight;
    gameContainer.style.height = `${windowHeight}px`;
  }

  window.addEventListener("load", adjustHeight);
  window.addEventListener("resize", adjustHeight);

  // For mobile browsers, call on orientation change
  window.addEventListener("orientationchange", () => {
    setTimeout(adjustHeight, 100); // Small delay to ensure the browser has updated
  });

  async function startGame() {
    Object.values(sounds).forEach((sound) => sound.load());
    previewWordsScreen.style.display = "none";

    if (walletConnection.walletAddress && currentUsername) {
      gameEnded = false;
      isFirstLetter = true;
      currentGameSpeed = INITIAL_GAME_SPEED;
      lettersPlaced = 0;
      lastUpdateTime = 0;
      gameLoopId = requestAnimationFrame(gameLoop);

      homepage.style.display = "none";
      gameContainer.style.display = "flex";
      clearGameState();
      initializeBoard();
      resizeBoard();
      drawBoard();
      spawnLetter();
      displayWordList();
      requestAnimationFrame(gameLoop);
      document.addEventListener("keydown", handleKeyPress);
      window.addEventListener("resize", resizeBoard);
    } else {
      alert(
        "Please connect your wallet and ensure you have a username before playing!",
      );
    }
  }

  function showEmailOnlyScreen() {
    const signupScreen = document.getElementById("signupScreen");
    signupScreen.style.display = "block";
    document.getElementById("usernameInput").style.display = "none";
    document.getElementById("emailInput").style.display = "block";
    document.getElementById("signupTitle").textContent = "Almost there!";
    document.getElementById("signupMessage").textContent =
      "We just need your email to complete your account setup.";
  }

  function showUsernameOnlyScreen() {
    const signupScreen = document.getElementById("signupScreen");
    signupScreen.style.display = "block";
    document.getElementById("usernameInput").style.display = "block";
    document.getElementById("emailInput").style.display = "none";
    document.getElementById("signupTitle").textContent = "Choose a Username";
    document.getElementById("signupMessage").textContent =
      "Please choose a username to complete your account setup.";
  }

  function showFullSignupScreen() {
    const signupScreen = document.getElementById("signupScreen");
    signupScreen.style.display = "block";
    document.getElementById("usernameInput").style.display = "block";
    document.getElementById("emailInput").style.display = "block";
    document.getElementById("signupTitle").textContent = "Create Your Account";
    document.getElementById("signupMessage").textContent =
      "Please provide a username and email to set up your account.";
  }

  function updateUserInfo() {
    const userInfoElement = document.getElementById("userInfo");
    if (walletConnection.walletAddress && currentUsername) {
      getPlayCount(walletConnection, walletConnection.walletAddress)
        .then(({ playCount }) => {
          const remainingPlays = Math.max(0, 3 - playCount);
          const shortWallet = walletConnection.walletAddress.slice(-4);
          userInfoElement.innerHTML = `
            <div style="margin: 0.3rem 0; opacity: 0.6;">AO Hyperstax</div>
            <div style="margin: 0; opacity: 0.6;">${currentUsername}#${shortWallet} | Plays left: ${remainingPlays}</div>
          `;
          userInfoElement.style.display = "block";
        })
        .catch((error) => {
          console.error("Error getting user info:", error);
          userInfoElement.innerHTML = `
            <h3 style="margin: 0; opacity: 0.6;"><strong>AO Hyperstax</strong></h3>
            <div style="margin: 0; opacity: 0.6;">${currentUsername} | Plays left: Unknown</div>
          `;
          userInfoElement.style.display = "block";
        });
    } else {
      userInfoElement.style.display = "none";
    }
  }

  async function showLeaderboard() {
    showLoading();

    try {
      const leaderboardData = await getLeaderboard(walletConnection, 100);
      const title = document.querySelector(".game-title");
      title.style.display = "none"; // Hide the title
      console.log("Leaderboard data fetched successfully");

      const leaderboardList = document.getElementById("leaderboardList");
      leaderboardList.innerHTML = ""; // Clear previous entries

      if (leaderboardData.Messages && leaderboardData.Messages.length > 0) {
        const leaderboard = JSON.parse(
          leaderboardData.Messages[0].Data,
        ).leaderboard;

        leaderboard.forEach((entry, index) => {
          const shortWallet = entry.walletAddress.slice(-4);

          const displayName =
            entry.username != "Unknown"
              ? `${entry.username}<span class="wallet-suffix">#${shortWallet}</span>`
              : `<span class="wallet-suffix">#${entry.walletAddress.slice(-12)}</span>`;

          const item = document.createElement("div");
          item.className = `leaderboard-item ${
            walletConnection.walletAddress === entry.walletAddress
              ? "users-placement"
              : ""
          }`;
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

    const jackpotWordsElement = wordListElement.querySelector("#jackpot-words");
    const regularWordsElement = wordListElement.querySelector("#regular-words");

    const jackpotWords = WORDS.filter((word) => word.length >= 3);
    const regularWords = WORDS.filter((word) => word.length < 3);

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
    const container = document.getElementById("gameContainer");
    const controls = document.getElementById("controls");
    const wordList = document.getElementById("word-list");

    const availableHeight =
      container.clientHeight -
      controls.clientHeight -
      wordList.clientHeight -
      40;
    const availableWidth = container.clientWidth - 20;

    const aspectRatio = BOARD_WIDTH / BOARD_HEIGHT;
    let boardWidth = availableWidth;
    let boardHeight = boardWidth / aspectRatio;

    if (boardHeight > availableHeight) {
      boardHeight = availableHeight;
      boardWidth = boardHeight * aspectRatio;
    }

    gameBoard.style.width = `${boardWidth}px`;
    gameBoard.style.height = `${boardHeight}px`;
    gameBoard.style.gridTemplateColumns = `repeat(${BOARD_WIDTH}, 1fr)`;
    gameBoard.style.gridTemplateRows = `repeat(${BOARD_HEIGHT}, 1fr)`;
  }

  function drawBoard() {
    // Ensure the game board has the correct number of cells
    while (gameBoard.children.length < BOARD_WIDTH * BOARD_HEIGHT) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      gameBoard.appendChild(cell);
    }

    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const index = y * BOARD_WIDTH + x;
        let cell = gameBoard.children[index];
        const currentLetter = board[y][x].letter || "";
        if (cell.textContent !== currentLetter) {
          cell.textContent = currentLetter;
        }
      }
    }

    if (
      currentLetter &&
      currentPosition.y >= 0 &&
      currentPosition.y < BOARD_HEIGHT &&
      currentPosition.x >= 0 &&
      currentPosition.x < BOARD_WIDTH
    ) {
      const currentCellIndex =
        currentPosition.y * BOARD_WIDTH + currentPosition.x;
      const currentCell = gameBoard.children[currentCellIndex];
      if (currentCell && currentCell.textContent !== currentLetter) {
        currentCell.textContent = currentLetter;
      }
    }
  }

  function spawnLetter() {
    currentLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    currentPosition = { x: Math.floor(BOARD_WIDTH / 2), y: -1 };

    // Check if we can move to the next position, considering processing columns
    if (!canMoveTo(currentPosition.x, currentPosition.y + 1, true)) {
      if (!isProcessingWords || !processingColumns.has(currentPosition.x)) {
        endGame();
      } else {
        // If the column is being processed, wait and try again
        setTimeout(spawnLetter, 100);
      }
    }
  }

  let lastUpdateTime = 0;
  let gameLoopId;

  function gameLoop(currentTime) {
    if (gameEnded) return;

    if (!lastUpdateTime) lastUpdateTime = currentTime;
    const deltaTime = currentTime - lastUpdateTime;

    if (deltaTime >= currentGameSpeed) {
      if (canMoveTo(currentPosition.x, currentPosition.y + 1)) {
        currentPosition.y++;
        if (isFirstLetter) {
          playSound("dropSound");
          isFirstLetter = false;
        }
      } else {
        if (currentPosition.y >= 0) {
          placeLetter();
          if (!isProcessingWords) {
            let match = checkWords();
            if (hasHitFloor(currentPosition.x, currentPosition.y) && !match)
              playSound("dropSound");
          }
        }
        spawnLetter();
      }
      drawBoard();
      lastUpdateTime = currentTime;
    }

    gameLoopId = requestAnimationFrame(gameLoop);
  }

  function hasHitFloor(x, y) {
    return (
      y === BOARD_HEIGHT - 1 ||
      (y < BOARD_HEIGHT - 1 && board[y + 1][x].letter !== "")
    );
  }

  function canMoveTo(x, y, checkProcessing = false) {
    if (checkProcessing && isProcessingWords && processingColumns.has(x)) {
      return true;
    }
    return (
      x >= 0 &&
      x < BOARD_WIDTH &&
      y < BOARD_HEIGHT &&
      (y < 0 || board[y][x].letter === "")
    );
  }

  function placeLetter() {
    // Check if the current position is within the board boundaries
    if (
      currentPosition.y >= 0 &&
      currentPosition.y < BOARD_HEIGHT &&
      currentPosition.x >= 0 &&
      currentPosition.x < BOARD_WIDTH
    ) {
      board[currentPosition.y][currentPosition.x] = {
        letter: currentLetter,
        timestamp: Date.now(),
      };
      lettersPlaced++;
      if (lettersPlaced % LETTERS_PER_SPEED_INCREASE === 0) {
        increaseSpeed();
      }
    } else {
      console.warn(
        "Attempted to place letter outside board boundaries:",
        currentPosition,
      );
    }
  }

  function increaseSpeed() {
    currentGameSpeed *= SPEED_INCREASE_FACTOR;
    currentGameSpeed = Math.max(currentGameSpeed, 150);
    console.log("Game speed increased to:", currentGameSpeed);
  }

  let isProcessingWords = false;

  function checkWords() {
    if (isProcessingWords) return;
    isProcessingWords = true;
    processingColumns.clear();

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
                processingColumns.add(x + dx * i);
              }
            }
          });
        });
      }
    }

    const uniqueWordsFound = Array.from(wordsFound).map(JSON.parse);
    if (uniqueWordsFound.length > 0) {
      processFoundWords(uniqueWordsFound);
      return true;
    } else {
      isProcessingWords = false;
      processingColumns.clear();
      return false;
    }
  }

  function processFoundWords(wordsFound) {
    const totalWords = wordsFound.length;
    let flashedWordsCount = 0;

    const flashPromises = wordsFound.map(async ({ x, y, word, dx, dy }) => {
      highlightWord(word);
      if (word.length >= 4) {
        playSound("specialMatch");
      } else {
        playSound("wordMatch");
      }
      return flashWord(x, y, word.length, dx, dy).then(() => {
        flashedWordsCount++;
        if (flashedWordsCount === totalWords) {
          clearAllWords(wordsFound);
          applyGravity();
          drawBoard();
          isProcessingWords = false;
          processingColumns.clear();
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
          setTimeout(flashStep, 100);
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
    score += points * 5;
    scoreDisplay.textContent = `${score}`;
  }

  function moveLetter(direction) {
    let newX = currentPosition.x;
    let newY = currentPosition.y;

    switch (direction) {
      case "left":
        newX = Math.max(0, currentPosition.x - 1);
        break;
      case "right":
        newX = Math.min(BOARD_WIDTH - 1, currentPosition.x + 1);
        break;
      case "down":
        while (newY < BOARD_HEIGHT - 1 && canMoveTo(newX, newY + 1)) {
          newY++;
        }
        break;
    }

    if (canMoveTo(newX, newY)) {
      currentPosition.x = newX;
      currentPosition.y = newY;

      if (direction === "down") {
        placeLetter();
        if (!isProcessingWords) {
          let wordMatched = checkWords();
          if (!wordMatched) {
            playSound("dropSound");
          }
        }
        spawnLetter();
      }
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

    gameContainer.style.display = "none";
    gameContainer.classList.remove("blur-background");

    homepage.style.display = "block";
    menuScreen.style.display = "block";
    title.style.display = "block";

    updateUserInfo();

    gameContainer.style.opacity = "1";
  }

  async function endGame() {
    if (gameEnded) return; // Prevent multiple calls
    gameEnded = true;

    cancelAnimationFrame(gameLoopId); // Cancel the animation frame instead of clearing an interval
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

  function showPreviewWords() {
    hasSeenPreviewWords = true;
    menuScreen.style.display = "none";
    previewWordsScreen.style.display = "flex";
    const previewWordList = document.getElementById("previewWordList");
    previewWordList.innerHTML = `
      <p class="game-description"><b>Objective:</b> Stack letters to form words and score points in this fast-paced word game!</p>
      <div id="preview-jackpot-words-container">
        <span class="jackpot-multiplier">x5</span>
        <div id="preview-jackpot-words"></div>
      </div>
      <div id="preview-regular-words"></div>
    `;

    const jackpotWordsElement = previewWordList.querySelector(
      "#preview-jackpot-words",
    );
    const regularWordsElement = previewWordList.querySelector(
      "#preview-regular-words",
    );

    const jackpotWords = WORDS.filter((word) => word.length >= 3);
    const regularWords = WORDS.filter((word) => word.length < 3);

    jackpotWords.sort((a, b) => b.length - a.length);

    jackpotWords.forEach((word) => {
      const wordElement = createWordElement(word, true);
      jackpotWordsElement.appendChild(wordElement);
    });

    regularWords.forEach((word) => {
      const wordElement = createWordElement(word, false);
      regularWordsElement.appendChild(wordElement);
    });
  }

  function createWordElement(word, isJackpot) {
    const wordElement = document.createElement("span");
    wordElement.textContent = word;
    wordElement.classList.add("word-item");
    if (isJackpot) {
      wordElement.classList.add("jackpot-word");
    }
    wordElement.addEventListener("click", () => showWordDescription(word));
    return wordElement;
  }

  function showWordDescription(word) {
    const description = WORD_DESCRIPTIONS[word] || "No description available.";
    const overlay = document.createElement("div");
    overlay.classList.add("word-description-overlay");
    overlay.innerHTML = `
      <div class="word-description-content">
        <span class="close-description">&times;</span>
        <h3>${word}</h3>
        <p>${description}</p>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay
      .querySelector(".close-description")
      .addEventListener("click", () => {
        document.body.removeChild(overlay);
      });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  function showModal() {
    const modal = document.getElementById("gameOverModal");
    modal.style.display = "flex";
    modal.style.opacity = "1";

    debouncedUpdateFinalScore();
  }

  let finalScoreUpdateInProgress = false;

  async function updateFinalScore() {
    if (finalScoreUpdateInProgress) {
      console.log("Final score update already in progress. Skipping.");
      return;
    }

    finalScoreUpdateInProgress = true;
    showModalLoading();

    try {
      const dryRunResult = await dryRunGetUserData(
        walletConnection,
        walletConnection.walletAddress,
      );
      console.log("User data fetched for score update");

      let currentMaxScore = 0;
      if (dryRunResult.Messages && dryRunResult.Messages.length > 0) {
        const userData = JSON.parse(dryRunResult.Messages[0].Data);
        currentMaxScore = userData.maxScore || 0;
      }

      await updatePlayCount(walletConnection, walletConnection.walletAddress);
      updateUserInfo();

      if (score > currentMaxScore) {
        await updateMaxScore(
          walletConnection,
          walletConnection.walletAddress,
          score,
        );
        console.log("New high score updated");
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
      finalScoreElement.textContent = `Score: ${score}`;
      document.getElementById("previousHighScore").textContent =
        "Error occurred while updating score";
    } finally {
      hideModalLoading();
      finalScoreUpdateInProgress = false;
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

  async function downloadKeyfile() {
    if (walletConnection.authMethod === "QuickWallet") {
      const jwk = await getKeyfile();
      const content = JSON.stringify(jwk);
      const blob = new Blob([content], { type: "application/json" });
      const blobUrl = URL.createObjectURL(blob);
      console.log(blobUrl);

      // Download the wallet
      // downloadFile(blobUrl, "arweave-keyfile.json");
    }
  }

  async function resetGame() {
    try {
      const { playCount, canPlay } = await getPlayCount(
        walletConnection,
        walletConnection.walletAddress,
      );

      if (!canPlay) {
        alert(
          "You have reached the maximum number of plays. Returning to main menu.",
        );
        backToMenuFromModal();
      } else {
        playCountUpdated = false;
        gameEnded = false;
        isFirstLetter = true;

        hideModal();
        document
          .getElementById("gameContainer")
          .classList.remove("blur-background");
        clearGameState();

        // Reset the board
        initializeBoard();

        // Redraw the empty board
        drawBoard();

        // Spawn a new letter
        spawnLetter();

        // Reset game variables
        currentGameSpeed = INITIAL_GAME_SPEED;
        lettersPlaced = 0;
        lastUpdateTime = 0;

        requestAnimationFrame(gameLoop);

        // Re-add event listeners
        document.addEventListener("keydown", handleKeyPress);
        window.addEventListener("resize", resizeBoard);

        // Make sure the game container is visible and not blurred
        gameContainer.style.display = "flex";
        gameContainer.classList.remove("blur-background");

        updateUserInfo();
      }
    } catch (error) {
      console.error("Error checking play count:", error);
      alert("An error occurred. Please try again.");
    }
  }
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const debouncedUpdateFinalScore = debounce(updateFinalScore, 1000);
});
