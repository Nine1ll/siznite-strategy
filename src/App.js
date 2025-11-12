import React, { useState, useEffect, useContext } from 'react';
import policyData from './data/policy.json';
import { ThemeContext } from './context/ThemeContext';
import './App.css';

function App() {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);

  // --- 상태 ---
  const [pos, setPos] = useState(0);
  const [turnsLeft, setTurnsLeft] = useState(8);
  const [bUsed, setBUsed] = useState(0);
  const [cUsed, setCUsed] = useState(0);
  const [mode, setMode] = useState("unique");
  const [recommendations, setRecommendations] = useState({ A: 0, B: 0, C: 0 });
  const [bestAction, setBestAction] = useState("");

  // --- 추천 갱신 (사전 계산된 데이터 사용) ---
  useEffect(() => {
    const bLeft = 3 - bUsed;
    const cLeft = 3 - cUsed;
    const key = `${pos}_${turnsLeft}_${bLeft}_${cLeft}_${mode}`;
    const probs = policyData[key] || { A: 0, B: 0, C: 0 };

    // 사용 불가한 액션은 0으로 강제
    const finalProbs = {
      A: probs.A || 0,
      B: bUsed < 3 ? probs.B || 0 : 0,
      C: cUsed < 3 ? probs.C || 0 : 0
    };

    setRecommendations(finalProbs);

    // --- 최적 액션 찾기 (A 우선 정책) ---
    let best = "A";
    let maxProb = finalProbs.A;

    // B가 A보다 명확히 높을 때만 선택
    if (finalProbs.B > maxProb + 0.001) {
      maxProb = finalProbs.B;
      best = "B";
    }

    // C가 현재 최고보다 명확히 높을 때만 선택
    if (finalProbs.C > maxProb + 0.001) {
      best = "C";
    }

    // 확률이 모두 0이면 bestAction 비우기
    if (maxProb <= 0) {
      setBestAction("");
    } else {
      setBestAction(best);
    }
  }, [pos, turnsLeft, bUsed, cUsed, mode]);

  // --- 액션 클릭 핸들러 (추천 시스템 → 실제 이동 없음) ---
  const handleUseAction = (action) => {
    if (turnsLeft <= 0) return;
    if (action === "B" && bUsed >= 3) return;
    if (action === "C" && cUsed >= 3) return;

    setTurnsLeft(prev => prev - 1);
    if (action === "B") setBUsed(prev => prev + 1);
    if (action === "C") setCUsed(prev => prev + 1);
  };

  const handleReset = () => {
    setPos(0);
    setTurnsLeft(8);
    setBUsed(0);
    setCUsed(0);
  };

  // --- 시각화 칸 수 설정 ---
  const maxPosition = mode === "unique" ? 17 : 16;

  // --- 위치 시각화 칸 생성 ---
  const positionBoxes = [];
  for (let i = 0; i < maxPosition; i++) {
    const p = i + 1;
    let className = "pos-box";
    if (p === pos) {
      className += " current-pos";
    }
    if (mode === "super_epic" && p === 15) {
      className += " goal";
    } else if (mode === "unique") {
      if (p === 14 || p === 16) {
        className += " goal";
      } else if (p > 16) {
        className += " fail";
      }
    }
    positionBoxes.push(<div key={p} className={className}>{p}</div>);
  }

  return (
    <div className={`App ${darkMode ? 'dark' : ''}`}>
      {/* 상단 정보 박스 */}
      <div className={`info-box ${darkMode ? 'dark' : ''}`}>
        ※ 확률은 정확히 목표 위치에 도달할 확률입니다.
      </div>

      <h1>🍪 CTOA: 시즈나이트 최적 선택 추천 시스템</h1>

      {/* 헤더 컨트롤 */}
      <div className="header-controls">
        <div className="mode-selector">
          <label>모드: </label>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="super_epic">슈퍼에픽</option>
            <option value="unique">유니크</option>
          </select>
        </div>
        <div className="theme-buttons">
          <button onClick={toggleDarkMode} className="theme-btn">
            {darkMode ? '☀️ 라이트모드' : '🌙 다크모드'}
          </button>
          <button onClick={handleReset} className="reset-btn">🔄 초기화</button>
        </div>
      </div>

      {/* 상태 입력 패널 */}
      <div className="state-panel">
        <div className="state-item">
          <div className="state-label">📍 현재 위치</div>
          <input
            type="number"
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            min="0"
            max={maxPosition}
            className="state-input"
          />
        </div>
        <div className="state-item">
          <div className="state-label">⏳ 남은 턴</div>
          <input
            type="number"
            value={turnsLeft}
            onChange={(e) => setTurnsLeft(Number(e.target.value))}
            min="0"
            max="8"
            className="state-input"
          />
        </div>
        <div className="state-item">
          <div className="state-label">세공하기</div>
          <div className="state-counter b">{bUsed} / 3</div>
        </div>
        <div className="state-item">
          <div className="state-label">안정제 사용</div>
          <div className="state-counter c">{cUsed} / 3</div>
        </div>
      </div>

      {/* 위치 시각화 */}
      <div className="position-visualizer">
        {positionBoxes}
      </div>

      {/* 액션 버튼 */}
      <div className="action-buttons">
        {['A', 'B', 'C'].map((action) => {
          const disabled = (action === 'B' && bUsed >= 3) || (action === 'C' && cUsed >= 3) || turnsLeft <= 0;
          return (
            <button
              key={action}
              className={`action-btn action-btn-${action} ${disabled ? 'disabled' : ''} ${bestAction === action ? 'best' : ''}`}
              onClick={() => !disabled && handleUseAction(action)}
            >
              {action === 'A' && '세게 두드리기 (+3~+6)'}
              {action === 'B' && '세공하기 (-3~+2)'}
              {action === 'C' && '안정제 사용 (0~+4)'}
              <div className="prob">
                {recommendations[action] > 0 ? `${(recommendations[action] * 100).toFixed(1)}%` : '–'}
              </div>
            </button>
          );
        })}
      </div>

      {/* 최적 액션 */}
      {bestAction && recommendations[bestAction] > 0 && (
        <div className="best-action">
          💡 최적 액션: {bestAction} ({(recommendations[bestAction] * 100).toFixed(1)}%)
        </div>
      )}

      <footer className={darkMode ? 'dark' : ''}>
        쿠키런: 모험의 탑 시즈나이트 전략 도우미
      </footer>
    </div>
  );
}

export default App;