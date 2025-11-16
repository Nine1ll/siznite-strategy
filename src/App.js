// src/App.js
import React, { useState, useEffect, useContext } from 'react';
import rawPolicyData from './data/culculated_prob.json'; // 배열 형태 JSON
import { ThemeContext } from './context/ThemeContext';
import './App.css';

/**
 * JSON(배열) → Map으로 변환
 * key 형식: `${pos}_${turnsLeft}_${bLeft}_${cLeft}_${mode}`
 * 값 형식: { A: {success, failure}, B: {...}, C: {...} }
 */
const policyMap = (() => {
  const map = new Map();
  rawPolicyData.forEach((item) => {
    const key = `${item.pos}_${item.turns_left}_${item.b_left}_${item.c_left}_${item.mode}`;
    map.set(key, {
      A: item.A ?? { success: 0, failure: 0 },
      B: item.B ?? { success: 0, failure: 0 },
      C: item.C ?? { success: 0, failure: 0 },
    });
  });
  return map;
})();

const DEFAULT_PROBS = {
  A: { success: 0, failure: 0 },
  B: { success: 0, failure: 0 },
  C: { success: 0, failure: 0 },
};

function App() {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [showHelp, setShowHelp] = useState(false);

  // 상태
  const [pos, setPos] = useState(0);
  const [turnsLeft, setTurnsLeft] = useState(8);
  const [bUsed, setBUsed] = useState(0);
  const [cUsed, setCUsed] = useState(0);
  const [mode, setMode] = useState("super_epic");
  const [recommendations, setRecommendations] = useState(DEFAULT_PROBS);
  const [bestActions, setBestActions] = useState([]);

  // 게임 결과(오버레이 표시용)
  // type: 'success' | 'fail'
  // grade: '슈퍼에픽' | '유니크' | '에픽' | null
  const [result, setResult] = useState(null);

  // 로그용: 이전 위치 + 로그 목록
  const [prevPos, setPrevPos] = useState(0);
  const [logs, setLogs] = useState([]);

  const isGameOver = !!result;

  // // 상단 박스에 쓸: 현재 모드 기준 '최고 등급 확률'과 '실패 확률'
  // const [currentBest, setCurrentBest] = useState({ success: 0, failure: 0 });
  // const [currentBest, setCurrentBest] = useState({ success: 0});


  // --- 추천 갱신 ---
  useEffect(() => {
    // 게임 끝났으면 추천 안 갱신
    if (result) return;

    // 규칙: 턴이 8이면 시작 위치는 항상 0
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

    // 최적 액션 찾기 (성공 확률 기준, A 우선)
    let actions = [
      { action: "A", prob: finalProbs.A.success },
      { action: "B", prob: finalProbs.B.success },
      { action: "C", prob: finalProbs.C.success },
    ]
      .filter(a => a.prob > 0)
      .sort((a, b) => b.prob - a.prob);

    // A가 동일 확률일 때 우선
    actions.sort((a, b) => {
      if (b.prob === a.prob) {
        if (a.action === 'A') return -1;
        if (b.action === 'A') return 1;
      }
      return b.prob - a.prob;
    });

    setBestActions(actions.slice(0, 2)); // 상위 2개만

    // 🔹 현재 모드 기준, "최고 상품" 확률과 "실패" 확률 (가장 좋은 액션 기준)
    let bestSucc = 0;
    // let bestFail = 0;
    ["A", "B", "C"].forEach((k) => {
      const p = finalProbs[k];
      if (!p) return;
      if (p.success > bestSucc) {
        bestSucc = p.success;
        // bestFail = p.failure;
      }
    });
    // setCurrentBest({ success: bestSucc, failure: bestFail });
  }, [pos, turnsLeft, bUsed, cUsed, mode, result]);

  // --- 게임 종료 판단 (중간 터짐 or 턴 종료) ---
  useEffect(() => {
    if (result) return;

    // 중간에 터짐 체크
    const isFailNow =
      mode === "super_epic" ? pos > 15 : pos > 16;

    if (isFailNow) {
      setResult({
        type: "fail",
        grade: null,
        title: "💥 실패",
        message: "시즈나이트가 터졌습니다. 다음에 다시 도전해 주세요.",
      });
      return;
    }

    // 아직 턴 남아 있으면 종료 아님
    if (turnsLeft > 0) return;

    // 턴이 0이 된 시점 → 최종 보상 판정
    if (mode === "super_epic") {
      if (pos === 15) {
        setResult({
          type: "success",
          grade: "슈퍼에픽",
          title: "🎉 축하합니다!",
          message: "슈퍼에픽 시즈나이트를 획득하셨습니다.",
        });
      } else if (pos >= 10 && pos <= 12) {
        setResult({
          type: "success",
          grade: "에픽",
          title: "✨ 축하합니다!",
          message: "에픽 시즈나이트를 획득하셨습니다.",
        });
      } else {
        setResult({
          type: "fail",
          grade: null,
          title: "😢 실패",
          message: "아무것도 획득하지 못했습니다.",
        });
      }
    } else {
      // unique 모드
      if (pos === 14 || pos === 16) {
        setResult({
          type: "success",
          grade: "유니크",
          title: "🎉 축하합니다!",
          message: "유니크 시즈나이트를 획득하셨습니다.",
        });
      } else if (pos <= 16) {
        // 14/16이 아니면 에픽 취급
        setResult({
          type: "success",
          grade: "에픽",
          title: "✨ 축하합니다!",
          message: "에픽 시즈나이트를 획득하셨습니다.",
        });
      } else {
        setResult({
          type: "fail",
          grade: null,
          title: "😢 실패",
          message: "시즈나이트가 터졌습니다.",
        });
      }
    }
  }, [pos, turnsLeft, mode, result]);

  // --- 액션 클릭 핸들러 (로그 포함) ---
  const handleUseAction = (action) => {
    if (turnsLeft <= 0 || result) return;
    if (action === "B" && bUsed >= 3) return;
    if (action === "C" && cUsed >= 3) return;

    // 이번 턴 번호 (1턴 ~ 8턴)
    const turnNumber = 9 - turnsLeft;
    const delta = pos - prevPos;

    // 로그 추가
    setLogs((prev) => [
      ...prev,
      {
        turn: turnNumber,
        action,
        from: prevPos,
        to: pos,
        delta,
      },
    ]);

    // 남은 턴 / 사용 횟수 반영
    setTurnsLeft((prev) => prev - 1);
    if (action === "B") setBUsed((prev) => prev + 1);
    if (action === "C") setCUsed((prev) => prev + 1);
  };

  const handleReset = () => {
    setPos(0);
    setTurnsLeft(8);
    setBUsed(0);
    setCUsed(0);
    setResult(null);
    setPrevPos(0);
    setLogs([]);
  };

  // // 팝업에서 확인을 누르면 다시 새 판 시작
  // const handleCloseResult = () => {
  //   handleReset();
  // };

  // --- 터질 위험 여부 판단 함수 (버튼 하이라이트용) ---
  const willFailAfterAction = (pos, action, mode) => {
    if (action === "A") {
      return mode === "super_epic" ? pos + 6 > 15 : pos + 6 > 16;
    } else if (action === "B") {
      return mode === "super_epic" ? pos + 3 > 15 : pos + 3 > 16;
    } else if (action === "C") {
      return mode === "super_epic" ? pos + 4 > 15 : pos + 4 > 16;
    }
    return false;
  };

  // 시각화 칸 수 설정
  const maxPosition = mode === "unique" ? 17 : 16; // super_epic은 16칸, unique는 17칸

  // 위치 시각화 (0칸 포함 + 클릭으로 이동)
  const positionBoxes = [];
  for (let p = 0; p <= maxPosition; p++) {
    let className = "pos-box clickable";
    let reward = "";

    // 현재 위치
    if (p === pos) className += " current-pos";

    if (p === 0) {
      className += " start-pos";
      reward = "시작";
    } else if (mode === "super_epic") {
      if (p === 15) {
        className += " goal";
        reward = "슈퍼에픽";
      } else if (p > 15) {
        className += " fail";
        reward = "터짐";
      } else if (p >= 10 && p <= 12) {
        className += " epic";
        reward = "에픽";
      } else {
        className += " rare";
        reward = "레어";
      }
    } else if (mode === "unique") {
      if (p === 14 || p === 16) {
        className += " goal";
        reward = "유니크";
      } else if (p > 16) {
        className += " fail";
        reward = "터짐";
      } else {
        className += " epic";
        reward = "에픽";
      }
    }

    positionBoxes.push(
      <div
        key={p}
        className={className}
        title={reward}
        onClick={() => {
          if (result) return;
          setPrevPos(pos);
          setPos(p);
        }}
      >
        {p}
      </div>
    );
  }

  // const mainLabel = mode === "super_epic" ? "슈퍼에픽" : "유니크";

  return (
    <div className={`App ${darkMode ? 'dark' : ''}`}>
      {/* 상단 정보 박스: 현재 모드 기준 확률 요약 */}
      <div className={`info-box ${darkMode ? 'dark' : ''}`}>
        <strong>잘 사용하시면 좋겠습니다.</strong>
      </div>

      <h1>🍪 쿠키런: 시즈나이트 추천 시스템</h1>

      {/* 사용 전 주의 문구 */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '20px',
          marginTop: '4px',
          marginBottom: '12px',
          opacity: 0.9,
        }}
      >
        <strong>
          사용 방법을 먼저 읽고, 무조건 위치를 먼저 입력해주세요
        </strong>
      </div>

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
          <h3 style={{
            margin: '0 0 12px 0',
            color: darkMode ? '#60a5fa' : '#1d4ed8',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            🎯 사용 방법
          </h3>

          <div style={{
            backgroundColor: darkMode ? '#0f172a' : '#bae6fd',
            borderLeft: `4px solid ${darkMode ? '#3b82f6' : '#0284c7'}`,
            padding: '12px',
            margin: '8px 0 16px 0',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            <strong>게임과 같은 버튼을 선택하고</strong><br />
            <strong>현재 위치</strong>를 입력하거나 칸을 클릭하면<br />
            다음 선택지를 알려드립니다
          </div>

          <ol style={{ paddingLeft: '20px', marginBottom: '16px', marginTop: '0' }}>
            <li>
              <strong>시즈나이트 종류</strong>를 선택하세요: 상급 또는 최상급
            </li>
            <li>
              <strong>현재 위치</strong>를 숫자로 입력하거나, 아래 칸을 클릭해 맞춰주세요
            </li>
            <li>
              각 행동(A/B/C)의 성공 확률을 보고, 게임에서 어떤 행동을 쓸지 결정하세요
            </li>
            <li>
              게임에서 행동을 사용해 주사위를 굴린 뒤, 새로 도달한 위치를 이 페이지에서도 다시 입력/클릭해 맞춰주세요
            </li>
            <li>
              마지막으로, 방금 사용한 행동 버튼(A/B/C)을 눌러 남은 턴과 사용 횟수를 반영하세요
            </li>
          </ol>

          <p style={{
            fontSize: '12px',
            fontStyle: 'italic',
            margin: '8px 0 0 0',
            color: darkMode ? '#9ca3af' : '#475569'
          }}>
            ※ 세게 두드리기는 무제한 사용 가능, 세공하기/안정제 사용은 각각 3회까지 사용 가능<br />
            ※ 목표: 상급 = <strong>15 도달</strong>, 최상급 = <strong>14 또는 16 도달</strong><br />
            ※ 모든 숫자는 동일한 확률로 등장한다고 가정하여 계산되었습니다
          </p>
        </div>
      )}

      {/* 헤더 컨트롤 */}
      <div className="header-controls">
        <div className="mode-selector">
          <label>모드: </label>
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              // 모드 바꾸면 새 판 시작
              setPos(0);
              setTurnsLeft(8);
              setBUsed(0);
              setCUsed(0);
              setResult(null);
              setPrevPos(0);
              setLogs([]);
            }}
          >
            <option value="super_epic">상급</option>
            <option value="unique">최상급</option>
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
            onChange={(e) => {
              if (isGameOver) return;
              const next = Number(e.target.value);
              if (Number.isNaN(next)) return;
              if (next < 0 || next > maxPosition) return;

              setPrevPos(pos);
              setPos(next);
            }}
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
            onChange={(e) => {
              if (isGameOver) return;
              const next = Number(e.target.value);
              if (Number.isNaN(next)) return;
              if (next < 0 || next > 8) return;
              setTurnsLeft(next);
            }}
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
          const disabled =
            isGameOver ||
            (action === 'B' && bUsed >= 3) ||
            (action === 'C' && cUsed >= 3) ||
            turnsLeft <= 0;
          const willFail = willFailAfterAction(pos, action, mode);

          return (
            <button
              key={action}
              className={`action-btn action-btn-${action} ${disabled ? 'disabled' : ''} ${willFail ? 'risky' : 'safe'}`}
              onClick={() => !disabled && handleUseAction(action)}
            >
              {action === 'A' && '세게 두드리기 (+3~+6)'}
              {action === 'B' && '세공하기 (-2~+3)'}
              {action === 'C' && '안정제 사용 (0~+4)'}
              <div className="prob">
                {recommendations[action]?.success > 0
                  ? `${(recommendations[action].success * 100).toFixed(1)}%`
                  : '–'}
              </div>
            </button>
          );
        })}
      </div>

      {/* 로그 패널 */}
      {logs.length > 0 && (
        <div className="log-panel">
          <h3>📜 이번 판 로그</h3>
          <ul>
            {logs.map((log, idx) => (
              <li key={idx}>
                <strong>{log.turn}턴</strong> — {log.action} 사용:&nbsp;
                {log.from} → {log.to}&nbsp;
                <span style={{ opacity: 0.8 }}>
                  ({log.delta >= 0 ? `+${log.delta}` : log.delta})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 최적 액션 2개 */}
      {bestActions.length > 0 && !isGameOver && (
        <div className="best-action">
          💡 최적 액션:
          {bestActions.map((a, i) => (
            <span key={i} style={{ fontWeight: 'bold', margin: '0 4px' }}>
              {a.action} ({(a.prob * 100).toFixed(1)}%)
            </span>
          ))}
        </div>
      )}

      <footer className={darkMode ? 'dark' : ''}>
        Feedback은 오픈채팅{" "}
        <a
          href="https://open.kakao.com/o/sBd2uO0h"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3b82f6', fontWeight: 'bold', textDecoration: 'underline' }}
        >
          타디스
        </a>
        를 찾아주세요.
      </footer>
      {/* 결과 오버레이 */}
      {/* {result && (
        <div className="result-overlay">
          <div className={`result-modal ${darkMode ? 'dark' : ''}`}>
            <h2>{result.title}</h2>
            <p>{result.message}</p>
            {result.grade && (
              <p style={{ marginTop: '8px', fontWeight: 'bold' }}>
                등급: {result.grade}
              </p>
            )}
            <button className="result-btn" onClick={handleCloseResult}>
              확인
            </button>
          </div>
        </div>
      )} */}
    </div>
  );
}

export default App;
