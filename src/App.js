// src/App.js

import React, { useState, useEffect, useContext } from 'react';
import policyData from './data/policy.json';
import { ThemeContext } from './context/ThemeContext';
import './App.css';

function App() {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [showHelp, setShowHelp] = useState(false); // 🆘 도움말 열림/닫힘 상태

  // --- 상태 ---
  const [pos, setPos] = useState(0);
  const [turnsLeft, setTurnsLeft] = useState(8);
  const [bUsed, setBUsed] = useState(0);
  const [cUsed, setCUsed] = useState(0);
  const [mode, setMode] = useState("unique");
  const [recommendations, setRecommendations] = useState({ A: 0, B: 0, C: 0 });
  const [bestAction, setBestAction] = useState("");

  // --- 추천 갱신 ---
  useEffect(() => {
    const bLeft = 3 - bUsed;
    const cLeft = 3 - cUsed;
    const key = `${pos}_${turnsLeft}_${bLeft}_${cLeft}_${mode}`;
    const probs = policyData[key] || { A: 0, B: 0, C: 0 };

    const finalProbs = {
      A: probs.A || 0,
      B: bUsed < 3 ? probs.B || 0 : 0,
      C: cUsed < 3 ? probs.C || 0 : 0
    };

    setRecommendations(finalProbs);

    let best = "A";
    let maxProb = finalProbs.A;

    if (finalProbs.B > maxProb + 0.001) {
      maxProb = finalProbs.B;
      best = "B";
    }
    if (finalProbs.C > maxProb + 0.001) {
      best = "C";
    }

    if (maxProb <= 0) {
      setBestAction("");
    } else {
      setBestAction(best);
    }
  }, [pos, turnsLeft, bUsed, cUsed, mode]);

  // --- 액션 클릭 핸들러 ---
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

  const maxPosition = mode === "unique" ? 17 : 16;

  const positionBoxes = [];
  for (let i = 0; i < maxPosition; i++) {
    const p = i + 1;
    let className = "pos-box";
    if (p === pos) className += " current-pos";
    if (mode === "super_epic" && p === 15) className += " goal";
    else if (mode === "unique") {
      if (p === 14 || p === 16) className += " goal";
      else if (p > 16) className += " fail";
    }
    positionBoxes.push(<div key={p} className={className}>{p}</div>);
  }

  return (
    <div className={`App ${darkMode ? 'dark' : ''}`}>
      {/* 상단 정보 박스 */}
      <div className={`info-box ${darkMode ? 'dark' : ''}`}>
        ※ 확률은 정확히 목표 위치(15 또는 14/16)에 도달할 확률입니다.
      </div>

      <h1>🍪 CTOA: 시즈나이트 추천 시스템</h1>

      {/* 도움말 버튼 */}
      <div style={{ textAlign: 'center', margin: '12px 0' }}>
        <button
          onClick={() => setShowHelp(!showHelp)}
          style={{
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px 8px',
            fontWeight: 'bold',
            textDecoration: 'underline',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            margin: '0 auto'
          }}
        >
          ❓ 사용 방법
        </button>
      </div>

      {/* 도움말 팝업 */}
      {showHelp && (
        <div style={{
          backgroundColor: darkMode ? '#1e293b' : '#e0f2fe',
          border: `1px solid ${darkMode ? '#4b5563' : '#3b82f6'}`,
          borderRadius: '10px',
          padding: '16px',
          margin: '16px auto',
          maxWidth: '600px',
          fontSize: '14px',
          lineHeight: '1.7',
          color: darkMode ? '#f9fafb' : '#1e40af',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {/* 제목 */}
          <h3 style={{ 
            margin: '0 0 12px 0', 
            color: darkMode ? '#60a5fa' : '#1d4ed8',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            🎯 사용 방법
          </h3>

          {/* 핵심 설명 - 박스형으로 강조 */}
          <div style={{
            backgroundColor: darkMode ? '#0f172a' : '#bae6fd',
            borderLeft: `4px solid ${darkMode ? '#3b82f6' : '#0284c7'}`,
            padding: '12px',
            margin: '8px 0 16px 0',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            <strong>게임과 같은 버튼을 선택하고</strong><br/>
            <strong>현재 위치</strong>를 입력하면 다음 선택지를 알려드립니다
          </div>

          {/* 단계별 안내 */}
          <ol style={{ paddingLeft: '20px', marginBottom: '16px', marginTop: '0' }}>
            <li>
              <strong>시즈나이트 종류</strong>를 선택하세요: 유니크 또는 슈퍼에픽
            </li>
            <li>
              <strong>현재 위치</strong>를 입력하세요 (예: 4)
            </li>
            <li>
              게임에서 <strong>세게 두드리기/세공하기/안정제 사용 중 하나를 선택한 후</strong>,<br/>
              이 페이지에서도 <strong>같은 버튼을 클릭</strong>하세요
            </li>
            <li>
              남은 턴과 세공하기/안정제 사용의 사용 횟수가 자동으로 감소합니다
            </li>
            <li>
              <strong>가장 높은 확률</strong>을 주는 액션을 확인하고,<br/>
              다음 선택지로 활용하세요!
            </li>
          </ol>

          {/* 참고사항 - 작게 별도 표시 */}
          <p style={{ 
            fontSize: '12px', 
            fontStyle: 'italic', 
            margin: '8px 0 0 0',
            color: darkMode ? '#9ca3af' : '#475569'
          }}>
            ※ 세게 두드리기는 무제한 사용 가능, 세공하기/안정제 사용은 각각 3회까지 사용 가능<br/>
            ※ 목표: 슈퍼에픽 = <strong>15 도달</strong>, 유니크 = <strong>14 또는 16 도달</strong><br/>
            ※ 모든 숫자는 동일한 확률로 등장한다고 가정하여 계산되었습니다
          </p>
        </div>
      )}

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
          <div className="state-label">세공하기 남은 횟수</div>
          <div className="state-counter b">{bUsed} / 3</div>
        </div>
        <div className="state-item">
          <div className="state-label">안정제 사용 남은 횟수</div>
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
              {action === 'B' && '세공하기 (-2~+3)'}
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
        Feedback은 오픈채팅 "타디스"를 찾아주세요.
      </footer>
    </div>
  );
}

export default App;