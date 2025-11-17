// src/App.js
import React, { useState, useEffect, useContext } from "react";
import { ThemeContext } from "./context/ThemeContext";

import Board from "./components/Board";
import ActionButtons from "./components/ActionButtons";
import LogPanel from "./components/LogPanel";
import HelpBox from "./components/HelpBox";

import { policyMap, DEFAULT_PROBS } from "./utils/policy";
import { ACTION_LABEL } from "./constants/actionLabels";

import "./App.css";

function App() {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [showHelp, setShowHelp] = useState(false);

  // 기본 모드: 상급
  const [mode, setMode] = useState("super_epic");

  const [pos, setPos] = useState(0);
  const [turnsLeft, setTurnsLeft] = useState(8);
  const [bUsed, setBUsed] = useState(0);
  const [cUsed, setCUsed] = useState(0);

  const [recommendations, setRecommendations] = useState(DEFAULT_PROBS);
  const [bestActions, setBestActions] = useState([]);

  const [logs, setLogs] = useState([]);
  const [pendingAction, setPendingAction] = useState(null); // 이번 턴에 선택한 행동

  const [result, setResult] = useState(null);
  const isGameOver = !!result;

  const maxPosition = mode === "unique" ? 17 : 16;
  const modeLabel = mode === "super_epic" ? "슈퍼에픽" : "유니크";

  // --- 확률 계산 ---
  useEffect(() => {
    if (isGameOver) return;

    const effectivePos = turnsLeft === 8 ? 0 : pos;
    const bLeft = 3 - bUsed;
    const cLeft = 3 - cUsed;
    const key = `${effectivePos}_${turnsLeft}_${bLeft}_${cLeft}_${mode}`;

    const probs = policyMap.get(key) || DEFAULT_PROBS;
    const finalProbs = {
      A: probs.A,
      B: bUsed < 3 ? probs.B : { success: 0, failure: 0 },
      C: cUsed < 3 ? probs.C : { success: 0, failure: 0 },
    };

    setRecommendations(finalProbs);

    const sorted = ["A", "B", "C"]
      .map((a) => ({ action: a, prob: finalProbs[a].success }))
      .sort((x, y) => y.prob - x.prob);

    setBestActions(sorted);
  }, [pos, turnsLeft, bUsed, cUsed, mode, isGameOver]);

  const topProb = bestActions.length ? bestActions[0].prob : 0;

  // --- 위치 클릭 (버튼 → 위치 순서) ---
  const handleSelectPosition = (p) => {
    if (isGameOver) return;
    if (!pendingAction) return; // 행동 안 고르면 로그 X

    const action = pendingAction;
    const turnNumber = 9 - turnsLeft;

    setLogs((prev) => [
      ...prev,
      {
        turn: turnNumber,
        action,
        label: ACTION_LABEL[action],
        from: pos,
        to: p,
        delta: p - pos,
      },
    ]);

    setTurnsLeft((t) => t - 1);
    if (action === "B") setBUsed((x) => x + 1);
    if (action === "C") setCUsed((x) => x + 1);

    setPos(p);
    setPendingAction(null);
  };

  // --- 행동 선택 (버튼 클릭) ---
  const handleChooseAction = (action) => {
    if (isGameOver) return;
    if (turnsLeft <= 0) return;
    if (action === "B" && bUsed >= 3) return;
    if (action === "C" && cUsed >= 3) return;

    setPendingAction(action);
  };

  const handleReset = () => {
    setPos(0);
    setTurnsLeft(8);
    setBUsed(0);
    setCUsed(0);
    setLogs([]);
    setResult(null);
    setPendingAction(null);
  };

  const handleModeChange = (e) => {
    const nextMode = e.target.value;
    setMode(nextMode);
    handleReset();
  };

  return (
    <div className={`App ${darkMode ? "dark" : ""}`}>
      {/* 상단 정보 박스 */}
      <div className={`info-box ${darkMode ? "dark" : ""}`}>
        현재 상태 기준, 최적 선택 시 <strong>{modeLabel} 도달 확률</strong>:{" "}
        <strong>{(topProb * 100).toFixed(2)}%</strong>
      </div>

      <h1>🍪 CTOA: 시즈나이트 추천 시스템</h1>

      <HelpBox
        show={showHelp}
        darkMode={darkMode}
        onToggle={() => setShowHelp((prev) => !prev)}
      />

      <div
        style={{
          textAlign: "center",
          fontSize: "14px",
          marginTop: "4px",
          marginBottom: "12px",
          opacity: 0.9,
        }}
      >
        <strong>
          ① 사용한 버튼을 누르고, ② 움직인 위치를 클릭하면 ③ 로그가 기록되고
          확률이 갱신됩니다.
        </strong>
      </div>

      {/* 모드/테마/초기화 */}
      <div className="header-controls">
        <div className="mode-selector">
          <label>모드: </label>
          <select value={mode} onChange={handleModeChange}>
            <option value="super_epic">상급</option>
            <option value="unique">최상급</option>
          </select>
        </div>
        <div className="theme-buttons">
          <button onClick={toggleDarkMode} className="theme-btn">
            {darkMode ? "☀️ 라이트모드" : "🌙 다크모드"}
          </button>
          <button onClick={handleReset} className="reset-btn">
            🔄 초기화
          </button>
        </div>
      </div>

      {/* 상태 패널 */}
      <div className="state-panel">
        <div className="state-item">
          <div className="state-label">📍 현재 위치</div>
          <div className="state-value">{pos}</div>
        </div>
        <div className="state-item">
          <div className="state-label">⏳ 남은 턴</div>
          <div className="state-value">{turnsLeft} / 8</div>
        </div>
        <div className="state-item">
          <div className="state-label">세공하기 사용</div>
          <div className="state-counter b">{bUsed} / 3</div>
        </div>
        <div className="state-item">
          <div className="state-label">안정제 사용</div>
          <div className="state-counter c">{cUsed} / 3</div>
        </div>
      </div>

      {/* 보드 (0~15/17칸) */}
      <Board
        mode={mode}
        pos={pos}
        maxPosition={maxPosition}
        onCellClick={handleSelectPosition}
      />

      {/* 행동 버튼 */}
      <ActionButtons
        recommendations={recommendations}
        bestActions={bestActions}
        bUsed={bUsed}
        cUsed={cUsed}
        turnsLeft={turnsLeft}
        isGameOver={isGameOver}
        pendingAction={pendingAction}
        onChooseAction={handleChooseAction}
      />

      {/* 로그 */}
      <LogPanel logs={logs} />

      <footer className={darkMode ? "dark" : ""}>
        Feedback은{" "}
        <a
          href="https://open.kakao.com/o/sBd2uO0h"
          target="_blank"
          rel="noopener noreferrer"
        >
          타디스
        </a>
        를 찾아주세요.
      </footer>
    </div>
  );
}

export default App;
