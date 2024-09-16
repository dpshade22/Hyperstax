# Hyperstax

Hyperstax is an engaging word game inspired by classic falling block puzzles, with a unique twist focused on creating words. Built using HTML, CSS, and JavaScript, this game challenges players to form words from falling letters while managing increasing speeds and scoring points.

## Features

- Dynamic game board with falling letters
- Word recognition system
- Score tracking
- Increasing difficulty as the game progresses
- Responsive design for both desktop and mobile play
- Pixelated retro-style UI elements
- Integration with Arweave blockchain for wallet connection and data storage

## How to Play

1. Connect your Arweave wallet.
2. Click "Let's Play" to begin.
3. Use left and right arrow keys (or on-screen buttons on mobile) to move the falling letter.
4. Use the down arrow key (or down button) to drop the letter quickly.
5. Form words horizontally, vertically, or diagonally.
6. Longer words score more points.
7. The game speeds up as you place more letters.
8. Game ends when the board fills up and no more letters can be placed.

## Word List

The game recognizes the following words:
ARWEAVE, PERMA, LUA, CU, SU, MU, AO, AI, $AR

## Prerequisites

This project uses Bun as the JavaScript runtime and package manager. If you don't have Bun installed, you can install it by following the instructions at [bun.sh](https://bun.sh/).

Alternatively, you can use Node.js and npm, but you may need to modify some scripts.

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/dpshade22/Hyperstax.git
   ```
2. Navigate to the project directory:
   ```
   cd Hyperstax
   ```
3. Install dependencies:
   - With Bun:
     ```
     bun install
     ```
   - With npm:
     ```
     npm install
     ```

## Development

To run the development server:

1. Run the following command:
   - With Bun:
     ```
     bun run dev
     ```
   - With npm:
     ```
     npm run dev
     ```
2. Open `http://localhost:3000` in your web browser to play the game.

The development server will automatically rebuild and refresh when you make changes to the source files.

## Building for Production

To build the project for production:

1. Run the build command:
   - With Bun:
     ```
     bun run build
     ```
   - With npm:
     ```
     npm run build
     ```
2. The built files will be in the `dist` directory.
