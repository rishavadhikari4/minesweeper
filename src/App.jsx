"use client"

import { useState, useEffect, useCallback } from "react"
import { RotateCcw, Flag, Bomb, Timer, Target, Settings, Trophy, Zap } from "lucide-react"

const DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mines: 10, name: "Easy" },
  medium: { rows: 16, cols: 16, mines: 40, name: "Medium" },
  hard: { rows: 16, cols: 30, mines: 99, name: "Hard" },
}

export default function App() {
  const [difficulty, setDifficulty] = useState("medium")
  const [showDifficultySelect, setShowDifficultySelect] = useState(true)
  const [board, setBoard] = useState([])
  const [gameStatus, setGameStatus] = useState("playing")
  const [mineCount, setMineCount] = useState(DIFFICULTIES.medium.mines)
  const [firstClick, setFirstClick] = useState(true)
  const [time, setTime] = useState(0)
  const [timerActive, setTimerActive] = useState(false)

  const { rows: ROWS, cols: COLS, mines: MINES } = DIFFICULTIES[difficulty]

  const initializeBoard = useCallback(() => {
    const newBoard = []
    for (let row = 0; row < ROWS; row++) {
      newBoard[row] = []
      for (let col = 0; col < COLS; col++) {
        newBoard[row][col] = {
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          adjacentMines: 0,
        }
      }
    }
    return newBoard
  }, [ROWS, COLS])

  const placeMines = useCallback(
    (board, firstRow, firstCol) => {
      const newBoard = board.map((row) => row.map((cell) => ({ ...cell })))
      let minesPlaced = 0
      while (minesPlaced < MINES) {
        const row = Math.floor(Math.random() * ROWS)
        const col = Math.floor(Math.random() * COLS)
        if ((row === firstRow && col === firstCol) || newBoard[row][col].isMine) continue
        newBoard[row][col].isMine = true
        minesPlaced++
      }
      return newBoard
    },
    [MINES, ROWS, COLS],
  )

  const calculateAdjacentMines = useCallback(
    (board) => {
      const newBoard = board.map((row) => row.map((cell) => ({ ...cell })))
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (!newBoard[row][col].isMine) {
            let count = 0
            for (let i = -1; i <= 1; i++) {
              for (let j = -1; j <= 1; j++) {
                const newRow = row + i
                const newCol = col + j
                if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS && newBoard[newRow][newCol].isMine) {
                  count++
                }
              }
            }
            newBoard[row][col].adjacentMines = count
          }
        }
      }
      return newBoard
    },
    [ROWS, COLS],
  )

  const revealCell = useCallback(
    (board, row, col) => {
      const newBoard = board.map((r) => r.map((cell) => ({ ...cell })))
      const queue = [{ row, col }]
      while (queue.length > 0) {
        const { row: r, col: c } = queue.shift()
        const cell = newBoard[r][c]
        if (cell.isRevealed || cell.isFlagged) continue
        cell.isRevealed = true
        if (cell.adjacentMines === 0 && !cell.isMine) {
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              const nr = r + i
              const nc = c + j
              if (
                nr >= 0 &&
                nr < ROWS &&
                nc >= 0 &&
                nc < COLS &&
                !newBoard[nr][nc].isRevealed &&
                !newBoard[nr][nc].isFlagged
              ) {
                queue.push({ row: nr, col: nc })
              }
            }
          }
        }
      }
      return newBoard
    },
    [ROWS, COLS],
  )

  const handleChordClick = useCallback(
    (row, col) => {
      if (gameStatus !== "playing") return
      const cell = board[row][col]
      if (!cell.isRevealed || cell.adjacentMines === 0 || cell.isMine) return
      let flaggedCount = 0
      const adjacentCells = []
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue
          const newRow = row + i
          const newCol = col + j
          if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS) {
            const adjacentCell = board[newRow][newCol]
            adjacentCells.push({ row: newRow, col: newCol, cell: adjacentCell })
            if (adjacentCell.isFlagged) flaggedCount++
          }
        }
      }
      if (flaggedCount === cell.adjacentMines) {
        setBoard((currentBoard) => {
          let newBoard = currentBoard.map((r) => r.map((cell) => ({ ...cell })))
          let hitMine = false
          for (const { row: r, col: c, cell: adjCell } of adjacentCells) {
            if (!adjCell.isRevealed && !adjCell.isFlagged) {
              newBoard = revealCell(newBoard, r, c)
              if (newBoard[r][c].isMine) hitMine = true
            }
          }
          if (hitMine) {
            setGameStatus("lost")
            setTimerActive(false)
            for (let r = 0; r < ROWS; r++) {
              for (let c = 0; c < COLS; c++) {
                if (newBoard[r][c].isMine) newBoard[r][c].isRevealed = true
              }
            }
          } else {
            let revealedCount = 0
            for (let r = 0; r < ROWS; r++) {
              for (let c = 0; c < COLS; c++) {
                if (newBoard[r][c].isRevealed && !newBoard[r][c].isMine) revealedCount++
              }
            }
            if (revealedCount === ROWS * COLS - MINES) {
              setGameStatus("won")
              setTimerActive(false)
            }
          }
          return newBoard
        })
      }
    },
    [gameStatus, board, revealCell, ROWS, COLS, MINES],
  )

  const handleCellClick = useCallback(
    (row, col) => {
      if (gameStatus !== "playing") return
      if (board[row][col].isRevealed) {
        handleChordClick(row, col)
        return
      }
      setBoard((currentBoard) => {
        let newBoard = currentBoard.map((r) => r.map((cell) => ({ ...cell })))
        if (firstClick) {
          newBoard = placeMines(newBoard, row, col)
          newBoard = calculateAdjacentMines(newBoard)
          setFirstClick(false)
          setTimerActive(true)
        }
        if (newBoard[row][col].isFlagged) return newBoard
        newBoard = revealCell(newBoard, row, col)
        if (newBoard[row][col].isMine) {
          setGameStatus("lost")
          setTimerActive(false)
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              if (newBoard[r][c].isMine) newBoard[r][c].isRevealed = true
            }
          }
        } else {
          let revealedCount = 0
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              if (newBoard[r][c].isRevealed && !newBoard[r][c].isMine) revealedCount++
            }
          }
          if (revealedCount === ROWS * COLS - MINES) {
            setGameStatus("won")
            setTimerActive(false)
          }
        }
        return newBoard
      })
    },
    [
      gameStatus,
      firstClick,
      placeMines,
      calculateAdjacentMines,
      revealCell,
      board,
      handleChordClick,
      ROWS,
      COLS,
      MINES,
    ],
  )

  const handleRightClick = useCallback(
    (e, row, col) => {
      e.preventDefault()
      if (gameStatus !== "playing" || board[row][col].isRevealed) return
      setBoard((currentBoard) => {
        const newBoard = currentBoard.map((r) => r.map((cell) => ({ ...cell })))
        newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged
        setMineCount((prev) => (newBoard[row][col].isFlagged ? prev - 1 : prev + 1))
        return newBoard
      })
    },
    [gameStatus, board],
  )

  const resetGame = useCallback(() => {
    setBoard(initializeBoard())
    setGameStatus("playing")
    setMineCount(MINES)
    setFirstClick(true)
    setTime(0)
    setTimerActive(false)
  }, [initializeBoard, MINES])

  const startNewGame = useCallback((newDifficulty) => {
    setDifficulty(newDifficulty)
    setShowDifficultySelect(false)
    setGameStatus("playing")
    setMineCount(DIFFICULTIES[newDifficulty].mines)
    setFirstClick(true)
    setTime(0)
    setTimerActive(false)
  }, [])

  useEffect(() => {
    let interval
    if (timerActive) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerActive])

  useEffect(() => {
    if (!showDifficultySelect) {
      setBoard(initializeBoard())
    }
  }, [initializeBoard, showDifficultySelect])

  const getCellContent = (cell) => {
    if (cell.isFlagged) return <Flag className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 drop-shadow-sm" />
    if (!cell.isRevealed) return null
    if (cell.isMine) return <Bomb className="w-3 h-3 sm:w-4 sm:h-4 text-red-700 animate-pulse" />
    if (cell.adjacentMines > 0)
      return <span className="text-xs sm:text-sm font-bold drop-shadow-sm">{cell.adjacentMines}</span>
    return null
  }

  const getCellClassName = (cell) => {
    const baseSize = difficulty === "hard" ? "w-6 h-6 text-xs" : "w-7 h-7 sm:w-8 sm:h-8 text-sm"
    let base = `${baseSize} border border-slate-300 flex items-center justify-center font-bold cursor-pointer select-none transition-all duration-150 `

    if (!cell.isRevealed) {
      base +=
        "bg-gradient-to-br from-slate-200 to-slate-300 hover:from-slate-100 hover:to-slate-200 shadow-inner hover:shadow-md active:scale-95 "
    } else {
      base += "bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner "
      if (cell.isMine) base += "from-red-100 to-red-200 "
      else if (cell.adjacentMines > 0) base += "hover:from-blue-50 hover:to-blue-100 "
    }

    if (cell.isRevealed && cell.adjacentMines > 0) {
      const colors = [
        "",
        "text-blue-600",
        "text-green-600",
        "text-red-600",
        "text-purple-600",
        "text-yellow-600",
        "text-pink-600",
        "text-slate-700",
        "text-black",
      ]
      base += colors[cell.adjacentMines]
    }
    return base
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }

  if (showDifficultySelect) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 overflow-hidden">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 sm:p-12 max-w-2xl w-full border border-white/20">
          <div className="text-center mb-12">
            <div className="text-6xl sm:text-8xl mb-6 animate-bounce">💣</div>
            <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Minesweeper
            </h1>
            <p className="text-slate-600 text-lg sm:text-xl">Choose your difficulty level</p>
          </div>

          <div className="space-y-4">
            {Object.entries(DIFFICULTIES).map(([key, config]) => (
              <button
                key={key}
                onClick={() => startNewGame(key)}
                className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
                  key === "easy"
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100 text-green-800"
                    : key === "medium"
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 text-blue-800"
                      : "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 hover:from-red-100 hover:to-rose-100 text-red-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="flex items-center gap-3 mb-2">
                      {key === "easy" && <Zap className="w-6 h-6" />}
                      {key === "medium" && <Target className="w-6 h-6" />}
                      {key === "hard" && <Trophy className="w-6 h-6" />}
                      <h3 className="text-2xl font-bold">{config.name}</h3>
                    </div>
                    <p className="text-sm opacity-75">
                      {config.rows} × {config.cols} grid • {config.mines} mines
                    </p>
                  </div>
                  <div className="text-3xl">{key === "easy" ? "🟢" : key === "medium" ? "🟡" : "🔴"}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Game content wrapper */}
      <div className="flex-1 flex flex-col p-2 sm:p-4 min-h-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20 flex-shrink-0">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <button
              onClick={() => setShowDifficultySelect(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">{DIFFICULTIES[difficulty].name}</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-700">💣 Minesweeper</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
              <Target className="w-5 h-5 text-red-600" />
              <span className="font-bold text-red-700">{mineCount}</span>
            </div>

            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">New Game</span>
            </button>

            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              <Timer className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-blue-700 tabular-nums">{formatTime(time)}</span>
            </div>
          </div>
        </div>

        {/* Game Status */}
        {gameStatus !== "playing" && (
          <div className="text-center mb-4">
            <div
              className={`inline-block px-6 py-4 rounded-2xl shadow-lg border-2 ${
                gameStatus === "won"
                  ? "bg-gradient-to-r from-green-100 to-emerald-100 border-green-300 text-green-800"
                  : "bg-gradient-to-r from-red-100 to-rose-100 border-red-300 text-red-800"
              }`}
            >
              <div className="text-2xl sm:text-3xl font-bold mb-1">
                {gameStatus === "won" ? "🎉 Victory!" : "💥 Game Over!"}
              </div>
              <div className="text-sm sm:text-base">
                {gameStatus === "won" ? "Congratulations!" : "Better luck next time!"}
              </div>
            </div>
          </div>
        )}

        {/* Game Board */}
        <div className="flex-1 flex items-center justify-center overflow-auto min-h-0">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 sm:p-6 shadow-2xl border border-white/20">
            <div
              className="grid gap-1 bg-gradient-to-br from-slate-200 to-slate-300 p-2 rounded-xl shadow-inner"
              style={{
                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                maxWidth: difficulty === "hard" ? "min(90vw, 800px)" : "auto",
              }}
            >
              {board.map((row, rowIdx) =>
                row.map((cell, colIdx) => (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={getCellClassName(cell)}
                    onClick={() => handleCellClick(rowIdx, colIdx)}
                    onContextMenu={(e) => handleRightClick(e, rowIdx, colIdx)}
                  >
                    {getCellContent(cell)}
                  </div>
                )),
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20 flex-shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-xs">L</span>
            </div>
            <span>Left click to reveal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 font-bold text-xs">R</span>
            </div>
            <span>Right click to flag</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-bold text-xs">#</span>
            </div>
            <span>Click numbers to auto-reveal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-bold text-xs">🏆</span>
            </div>
            <span>Clear all safe cells!</span>
          </div>
        </div>
      </div>
    </div>
  )
}
