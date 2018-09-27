import { Tile } from './Tile.js';

const gameState = {
  previousBoard: null,
  board: null,
  score: 0,
  gameOver: false,
};

startGame();

function makeEmptyBoard() {
  return Array(4).fill(Array(4).fill(null));
}

function copyBoard(board) {
  return board.map((row) => {
    return row.map((cell) => {
      return cell;
    })
  })
}

function isGameOver(board) {
  return board.reduce((rowSuccess, row) => {
    if (!rowSuccess) {
      return false;
    }

    return row.reduce((cellSuccess, cell) => {
      if (!cellSuccess) {
        return false;
      }

      return !!cell;
    }, true);
  }, true);
}

function getAvailableCells(board) {
  let available = [];
  for (let row = 0; row < board.length; row += 1) {
    for (let column = 0; column < board[0].length; column += 1) {
      if (!board[row][column]) {
        available = [...available, { row, column }];
      }
    }
  }

  return available;
}

function addRandomTile(board, tileValue = 2) {
  const availableCells = getAvailableCells(board);

  // If we can't possibly add another item, do nothing.
  if (availableCells.length === 0) {
    return;
  }

  const randomIndex = Math.floor(Math.random() * availableCells.length);
  let { row, column } = availableCells[randomIndex];

  const newId = getTileCount(board) + 1;
  const copy = copyBoard(board);
  copy[row][column] = new Tile(newId, tileValue);
  return copy;
}

function getTileCount(board) {
  const count = board.reduce((count, row) => {
    const rowCount = row.reduce((rowCount, cell) => {
      return !!cell ? count + 1 : count;
    }, 0);

    return count + rowCount;
  }, 0);

  return count;
}

function flatten(list) {
  return list.reduce((accumulator, item) => {
    return `${accumulator}${item}`;
  }, '');
}

function drawGame(state) {
  let gameOverIndicator = document.getElementById('game-over-indicator');
  gameOverIndicator.innerHTML = (
    `${state.gameOver ? 'GAME OVER' : 'PLAYING'}`
  );

  let scoreIndicator = document.getElementById('score-indicator');
  scoreIndicator.innerHTML = `SCORE: ${state.score}`;

  drawBoard(state.board);
}

function drawBoard(board) { // Impure
  let boardDiv = document.getElementById('game-board');

  let floatingTiles = [];

  const rowElements = board.map((row) => {
    const cellElements = row.map((cell) => {
      let displayText;
      let tile;
      if (cell) {
        displayText = cell.value;
        tile = (
          `<div
            name="tile-${cell.id}"
            class="tile"
            style="position: absolute;"
          >
            ${cell.value}
          </div>`
        );
        floatingTiles = [...floatingTiles, tile];
      }

      return `<div class="cell">${displayText || ''}</div>`;
    });

    let temp = flatten(cellElements);

    return (
      `<div class="board-row">${flatten(cellElements)}</div>`
    );
  });

  // ${flatten(floatingTiles)}
  const body = `${flatten(rowElements)}`;

  boardDiv.innerHTML = body;
}

function moveTiles(state, direction) {
  const { board } = state;
  let { score } = state;

  let vector = { row: 0, column: 0 };
  switch (direction) {
    case 'up': vector.row = -1; break;
    case 'right': vector.column = 1; break;
    case 'down': vector.row = 1; break;
    case 'left': vector.column = -1; break;
    default: break;
  }

  let copy = copyBoard(board);

  const rowStart = vector.row === -1 ? board.length - 1 : 0;
  const rowEnd = vector.row === -1 ? 0 : board.length - 1;
  const columnStart = vector.column === -1 ? 0 : board[0].length - 1;
  const columnEnd = vector.column === -1 ? board[0].length - 1 : 0;
  const rowDirection = (rowEnd - rowStart) / Math.abs(rowEnd - rowStart);
  const columnDirection = (columnEnd - columnStart) / Math.abs(columnEnd - columnStart);
  for (let row = rowStart; Math.abs(rowEnd + rowDirection - row) > 0; row += rowDirection) {
    for (let column = columnStart; Math.abs(columnEnd + columnDirection - column) > 0; column += columnDirection) {
      const cell = copy[row][column];
      if (cell) {
        // we've got a tile. Let's calculate its movement.
        const targetPosition = getSlidePosition(
          copy,
          { row, column },
          vector
        );

        // If this target position is different from where we started, then
        // swap the tile into the new cell and clear the old one.
        if (targetPosition.row !== row || targetPosition.column !== column) {
          const temp = copy[row][column];

          const targetCell = copy[targetPosition.row][targetPosition.column];
          if (targetCell) {
            temp.value = temp.value * 2;
            score += temp.value;
          }

          copy[targetPosition.row][targetPosition.column] = temp;
          copy[row][column] = null;
        }
      }
    }
  }

  return { board: copy, score };
}

function inBounds(board, position) {
  return (
    position.row >= 0
    && position.row < board.length
    && position.column >= 0
    && position.column < board[0].length
  );
}

function isOccupied(board, position) {
  return !!board[position.row][position.column];
}

function getSlidePosition(board, startingPosition, vector) {
  const checkOffset = (board, currentPosition, vector) => {
    const nextPosition = {
      row: currentPosition.row + vector.row,
      column: currentPosition.column + vector.column,
    };

    if (!inBounds(board, nextPosition)) {
      return currentPosition;
    }

     if (isOccupied(board, nextPosition)) {
       // If the next position is occupied return our previous position, unless
       // the next position's tile has the same value as ours, in which case
       // we need to merge.
       const thisTile = board[startingPosition.row][startingPosition.column];
       const otherTile = board[nextPosition.row][nextPosition.column]
       if (thisTile.value === otherTile.value) {
         return nextPosition;
       }

       return currentPosition;
     }

    return checkOffset(board, nextPosition, vector);
  };

  const targetPosition = checkOffset(board, startingPosition, vector);

  return targetPosition;
}

function processTurn(state, inputs) {
  if (state.gameOver) {
    console.log('Nothing to do, game is over');
    return state;
  }

  let direction = null;
  if (inputs.up) {
    direction = 'up';
  } else if (inputs.right) {
    direction = 'right';
  } else if (inputs.left) {
    direction = 'left';
  } else if (inputs.down) {
    direction = 'down';
  }

  if (direction === null) {
    console.log('Bad input');
    return state;
  }

  let { board: modifiedBoard, score } = moveTiles(state, direction);
  modifiedBoard = addRandomTile(modifiedBoard);

  const gameOver = isGameOver(modifiedBoard);

  return {
    score,
    gameOver,
    board: modifiedBoard,
    previousBoard: state.board,
  };
}

function handleInput(e) {
  const inputs = {};
  switch (e.key) {
    case 'ArrowUp': inputs.up = true; break;
    case 'ArrowDown': inputs.down = true; break;
    case 'ArrowRight': inputs.right = true; break;
    case 'ArrowLeft': inputs.left = true; break;
    default: break;
  }

  const currentState = processTurn(gameState, inputs);
  gameState.board = currentState.board;
  gameState.gameOver = currentState.gameOver;
  gameState.score = currentState.score;
  gameState.previousBoard = currentState.previousBoard;
  drawGame(gameState);
}

function startGame() {
  console.log('Started');

  gameState.board = addRandomTile(makeEmptyBoard());
  gameState.previousBoard = gameState.board;
  drawGame(gameState);

  window.addEventListener('keydown', handleInput, false);

  // window.requestAnimationFrame(() => {
  //   interpolateTiles(gameState.board);
  // });
}

function getTilesAndPositions(board) {
  const tiles = board.reduce((acc, row, rowIndex) => {
    const cells = row.reduce((acc, cell, columnIndex) => {
      if (cell) {
        const position = { row: rowIndex, column: columnIndex };
        return [...acc, { ...cell, position }];
      }

      return acc;
    }, []);

    if (cells.length > 0) {
      return [...acc, ...cells];
    }

    return acc;
  }, []);

  return tiles;
}

function interpolateTiles(board) {
  const tiles = getTilesAndPositions(board);
  tiles.forEach((tile) => {
    const [tileElement] = document.getElementsByName(`tile-${tile.id}`);
    if (tileElement) {
      const { position } = tile;
      const currentPosition = {
        row: tileElement.style.top,
        column: tileElement.style.left
      };

      const displacement = {
        row: currentPosition.row - position.row,
        column: currentPosition.column - position.column,
      };

      const springConstant = 4.0;

      const acceleration = 2 * 1/60;

      // tileElement.style.left = (100 + 2) * (currentPosition + displacement / 2);
      // tileElement.style.top = (100 + 2) * position.row;
    }
  });

  window.requestAnimationFrame(() => {
    interpolateTiles(gameState.board);
  });
}

window.gameState = gameState;
