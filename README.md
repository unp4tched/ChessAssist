# Chess Assistant

A modern, interactive chess position editor and analysis tool powered by Stockfish WASM and a custom alpha-beta engine. Build custom positions, analyze them with engine suggestions, and explore chess variations with an intuitive drag-and-drop interface.

![Chess Assistant](https://img.shields.io/badge/chess-assistant-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 🎯 Dual-Mode Interface
- **Setup Mode**: Freely position pieces with drag-and-drop controls
- **Analysis Mode**: Play moves and receive real-time engine suggestions

### 🤖 Powerful Chess Engine
- **Stockfish 10** integration via WebAssembly for professional-strength analysis
- **Fallback minimax engine** with alpha-beta pruning for offline use
- Adjustable thinking time (Fast, Balanced, Strong)
- Real-time evaluation display with progress indicators

### 📊 Position Management
- FEN string import/export
- Copy position to clipboard
- Persistent state across sessions
- Quick position reset and clear

### 🎨 Modern UI/UX
- Dark-themed, responsive design
- Smooth drag-and-drop piece movement
- Visual move highlighting (legal moves, captures, last move)
- Piece inventory with drag-to-board placement
- Trash zone for easy piece removal

## Demo

Open `index.html` in any modern web browser to start using Chess Assistant. No build process or server required.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/ChessAssist.git

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

### Fallback Engine
- Alpha-beta negamax search with move ordering
- Transposition table (200k entries)
- Quiescence search with delta pruning
- Killer move and history heuristics
- MVV-LVA capture ordering
- Piece-square tables for positional evaluation
- Endgame detection with separate king tables

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome/Edge | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Opera | 76+ | ✅ Full |

**Requirements**: WebAssembly support, ES6 features, CSS Grid

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

## Performance

- **Initial Load**: < 2 seconds (including WASM)
- **Position Setup**: Instant drag-and-drop response
- **Fast Mode**: 600ms per move
- **Balanced Mode**: 1200ms per move
- **Strong Mode**: 2500ms per move
- **Memory Usage**: ~50-80 MB (including engine)

## Features in Detail

### Position Validation
- Automatic illegal position detection
- Game-over state recognition (checkmate, stalemate, draw)
- Castling rights preservation
- En passant square tracking

### Move Visualization
- Orange highlighting for source square
- Green highlighting for destination square
- Dot indicators for legal destination squares
- Ring indicators for capture moves

### Keyboard Shortcuts
- `Escape`: Deselect pieces and clear palette

## Documentation

- **[Quick Start Guide](docs/QUICKSTART.md)** - Get up and running in 60 seconds
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deploy to GitHub Pages, Netlify, Vercel, or custom servers
- **[Contributing Guide](docs/CONTRIBUTING.md)** - How to contribute to the project
- **[Changelog](docs/CHANGELOG.md)** - Version history and release notes

## Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/CONTRIBUTING.md) before submitting a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License. See below for third-party licenses:

- **chess.js**: BSD-2-Clause
- **Stockfish**: GPL v3
- **Cburnett Chess Pieces**: CC-BY-SA 3.0
- **Tailwind CSS**: MIT

## Acknowledgments

- [Stockfish Team](https://stockfishchess.org/) for the powerful chess engine
- [Jeff Hlywa](https://github.com/jhlywa) for chess.js
- [Cburnett](https://en.wikipedia.org/wiki/User:Cburnett) for the beautiful piece artwork
- Tailwind Labs for the excellent CSS framework

## Support

For questions, bug reports, or feature requests, please open an issue on GitHub.

---

**Built with ♟️ by developers, for chess enthusiasts**
