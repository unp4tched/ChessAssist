# Chess Assistant

A modern, interactive chess position editor and analysis tool powered by Stockfish WASM and a custom alpha-beta engine. Build custom positions, analyze them with engine suggestions, and explore chess variations with an intuitive drag-and-drop interface.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/unp4tched/ChessAssist.git

# Navigate to the directory
cd ChessAssist

# Open in browser
# Simply open index.html in your preferred browser
```

## Usage

### Setup Mode

1. **Drag pieces** from the inventory onto the board
2. **Click pieces** in the inventory to "arm" them, then click board squares to place
3. **Drag board pieces** to reposition them
4. **Drop pieces** on the trash or off-board to remove
5. **Switch turn** using the side-to-move selector
6. **Copy/Load FEN** strings for position sharing

### Analysis Mode

1. Click **"Begin"** to start the analysis session
2. The engine automatically suggests the best move after each position change
3. **Drag pieces** to make moves (only legal moves allowed)
4. Click **"Play"** on suggestions to apply them
5. Review engine evaluation and depth/node statistics
6. Click **"Stop"** to return to setup mode

## Technical Stack

- **Frontend**: Vanilla JavaScript (ES5+), HTML5, CSS3
- **UI Framework**: Tailwind CSS (via CDN)
- **Chess Logic**: [chess.js](https://github.com/jhlywa/chess.js) - Move generation and validation
- **Engine**: [Stockfish 10 WASM](https://github.com/niklasf/stockfish.wasm) + custom alpha-beta minimax
- **Piece Graphics**: [Cburnett Chess Pieces](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces) (CC-BY-SA 3.0)

## Engine Details

### Stockfish Integration
- UCI protocol communication via Web Worker
- Configurable thinking time (600ms - 2500ms)
- Move-time search with depth reporting
- Automatic fallback on unavailability

## Project Structure

```
ChessAssist/
├── index.html              # Main application HTML
├── app.js                  # UI logic and Stockfish client
├── assets/
│   ├── chess.min.js        # Chess move generation library
│   ├── engine.js           # Fallback alpha-beta engine
│   ├── stockfish.js        # Stockfish WASM worker
│   ├── stockfish.wasm      # Stockfish binary
│   ├── tailwind.js         # Tailwind CSS CDN
│   └── pieces/             # SVG piece images (12 files)
├── docs/                   # Documentation
│   ├── CHANGELOG.md        # Version history
│   ├── CONTRIBUTING.md     # Contribution guidelines
│   ├── DEPLOYMENT.md       # Deployment guide
│   └── QUICKSTART.md       # Quick start tutorial
├── LICENSE                 # MIT License
├── package.json            # Project metadata
└── README.md               # This file
```


## Acknowledgments

- [Stockfish Team](https://stockfishchess.org/) for the chess engine
- [Jeff Hlywa](https://github.com/jhlywa) for chess.js
- [Cburnett](https://en.wikipedia.org/wiki/User:Cburnett) for the piece artwork
- Tailwind Labs for the excellent CSS framework

## Support

For questions, bug reports, or feature requests, please open an issue on GitHub.

---
