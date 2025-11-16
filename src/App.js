// src/App.js
import React, { useState, useEffect, useContext, useMemo } from 'react';
import rawPolicyData from './data/culculated_prob.json'; // 배열 형태 JSON이라고 가정
import { ThemeContext } from './context/ThemeContext';
import './App.css';


const ACTION_LABEL = {
  A: '세게 두드리기',
  B: '세공하기',
  C: '안정제 사용',
};


const DEFAULT_PROBS = {
  A: { success: 0, failure: 0 },
  B: { success: 0, failure: 0 },
  C: { success: 0, failure: 0 },
};

function App() {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [showHelp, setShowHelp] = useState(false);

  // --------- 정책 테이블 변환 (JSON -> Map) ----------
  const policyMap = useMemo(() => {
    const map = new Map();

    try {
      if (Array.isArray(rawPolicyData)) {
        rawPolicyData.forEach((item) => {
          const key = `${item.pos}_${item.turns_left}_${item.b_left}_${item.c_left}_${item.mode}`;
          map.set(key, {
            A: item.A ?? { success: 0, failure: 0 },
            B: item.B ?? { success: 0, failure: 0 },
            C: item.C ?? { success: 0, failure: 0 },
          });
        });
      } else {
        console.warn('culculated_prob.json이 배열 형태가 아닙니다.', rawPolicyData);
      }
    } catch (e) {
      console.error('policyMap 생성 중 에러:', e);
    }

    console.log('policyMap size:', map.size);
    return map;
  }, []);

  // --------- 상태 ----------
  const [pos, setPos] = useState(0);          // 현재 위치
  const [turnsLeft, setTurnsLeft] = useState(8);
  const [bUsed, setBUsed] = useState(0);      // 세공하기 사용 횟수
  const [cUsed, setCUsed] = useState(0);      // 안정제 사용 횟수
  const [mode, setMode] = useState('super_epic'); // ✅ 기본: 상급
  const [recommendations, setRecommendations] = useState(DEFAULT_PROBS);
  const [bestActions, setBestActions] = useState([]);

  // 게임 종료 여부
  const [result, setResult] = useState(null);
  const isGameOver = !!result;

  // 로그
  const [logs, setLogs] = useState([]);
  const [prevPos, setPrevPos] = useState(0);

  // 이번 턴에 선택한 액션(A/B/C). 없으면 null
  const [selectedAction, setSelectedAction] = useState(null);

  // 현재 상태 기준 최고 등급 도달 최대 확률
  const [currentBest, setCurrentBest] = useState({ success: 0 });

  // --------- 추천 갱신 ----------
  useEffect(() => {
    if (result) return; // 게임 끝났으면 갱신 안함

    const effectivePos = turnsLeft === 8 ? 0 : pos;

    const bLeft = 3 - bUsed;
    const cLeft = 3 - cUsed;
    const key = `${effectivePos}_${turnsLeft}_${bLeft}_${cLeft}_${mode}`;

    const probs = policyMap.get(key) || DEFAULT_PROBS;

    const finalProbs = {
      A: probs.A,
      B: bLeft > 0 ? probs.B : { success: 0, failure: 0 },
      C: cLeft > 0 ? probs.C : { success: 0, failure: 0 },
    };

    setRecommendations(finalProbs);

    // 최적 액션 (성공 확률 기준)
    let actions = [
      { action: 'A', prob: finalProbs.A.success },
      { action: 'B', prob: finalProbs.B.success },
      { action: 'C', prob: finalProbs.C.success },
    ]
      .filter((a) => a.prob > 0)
      .sort((a, b) => b.prob - a.prob);

    // A 우선 정렬
    actions.sort((a, b) => {
      if (b.prob === a.prob) {
        if (a.action === 'A') return -1;
        if (b.action === 'A') return 1;
      }
      return b.prob - a.prob;
    });

    setBestActions(actions.slice(0, 2));

    // 최고 등급 도달 최대 확률
    let bestSucc = 0;
    ['A', 'B', 'C'].forEach((k) => {
      const p = finalProbs[k];
      if (!p) return;
      if (p.success > bestSucc) bestSucc = p.success;
    });
    setCurrentBest({ success: bestSucc });
  }, [pos, turnsLeft, bUsed, cUsed, mode, result, policyMap]);

  // --------- 게임 종료 판정 ----------
  useEffect(() => {
    if (result) return;

    // 중간에 터짐
    const isFailNow = mode === 'super_epic' ? pos > 15 : pos > 16;
    if (isFailNow) {
      setResult({
        type: 'fail',
        grade: null,
        title: '💥 실패',
        message: '시즈나이트가 터졌습니다. 다음에 다시 도전해 주세요.',
      });
      return;
    }

    // 아직 턴 남아있으면 종료 아님
    if (turnsLeft > 0) return;

    // 턴 0 → 최종 판정
    if (mode === 'super_epic') {
      if (pos === 15) {
        setResult({
          type: 'success',
          grade: '슈퍼에픽',
          title: '🎉 축하합니다!',
          message: '슈퍼에픽 시즈나이트를 획득하셨습니다.',
        });
      } else if (pos >= 10 && pos <= 12) {
        setResult({
          type: 'success',
          grade: '에픽',
          title: '✨ 축하합니다!',
          message: '에픽 시즈나이트를 획득하셨습니다.',
        });
      } else {
        setResult({
          type: 'fail',
          grade: null,
          title: '😢 실패',
          message: '아무것도 획득하지 못했습니다.',
        });
      }
    } else {
      // unique 모드
      if (pos === 14 || pos === 16) {
        setResult({
          type: 'success',
          grade: '유니크',
          title: '🎉 축하합니다!',
          message: '유니크 시즈나이트를 획득하셨습니다.',
        });
      } else if (pos <= 16) {
        setResult({
          type: 'success',
          grade: '에픽',
          title: '✨ 축하합니다!',
          message: '에픽 시즈나이트를 획득하셨습니다.',
        });
      } else {
        setResult({
          type: 'fail',
          grade: null,
          title: '😢 실패',
          message: '시즈나이트가 터졌습니다.',
        });
      }
    }
  }, [pos, turnsLeft, mode, result]);

  // --------- 한 턴 확정 처리 ----------
  const commitTurn = (action, newPos) => {
    console.log('commitTurn 호출됨:', { action, newPos, turnsLeft });

    if (!action) return;
    if (turnsLeft <= 0 || result) return;

    // 사용 가능 여부 체크
    if (action === 'B' && bUsed >= 3) return;
    if (action === 'C' && cUsed >= 3) return;

    const fromPos = pos;
    const delta = newPos - fromPos;
    const turnNumber = 9 - turnsLeft; // 1~8

    // 로그 기록
    setLogs((prev) => [
      ...prev,
      {
        turn: turnNumber,
        action,
        from: fromPos,
        to: newPos,
        delta,
      },
    ]);

    // 상태 갱신
    setPos(newPos);
    setPrevPos(fromPos);
    setTurnsLeft((prev) => prev - 1);
    if (action === 'B') setBUsed((prev) => prev + 1);
    if (action === 'C') setCUsed((prev) => prev + 1);
  };

  // --------- 보드 칸 클릭 ----------
  const handlePositionClick = (p) => {
    console.log('칸 클릭:', p, 'selectedAction:', selectedAction);

    if (result) return;

    // 액션이 선택 안 된 상태 → 단순 현재 위치 맞추기
    if (selectedAction === null) {
      setPrevPos(pos);
      setPos(p);
      return;
    }

    // 액션 선택 + 칸 클릭 → 한 턴 확정
    commitTurn(selectedAction, p);
    setSelectedAction(null); // 턴 끝났으니 선택 해제
  };

  // --------- 액션 버튼 클릭 ----------
  const handleSelectAction = (action) => {
    if (result || turnsLeft <= 0) return;
    if (action === 'B' && bUsed >= 3) return;
    if (action === 'C' && cUsed >= 3) return;

    console.log('액션 선택 클릭:', action);

    if (selectedAction === action) {
      setSelectedAction(null);
    } else {
      setSelectedAction(action);
    }
  };

  const handleReset = () => {
    setPos(0);
    setTurnsLeft(8);
    setBUsed(0);
    setCUsed(0);
    setResult(null);
    setLogs([]);
    setPrevPos(0);
    setSelectedAction(null);
  };

  // --------- 터질 위험 여부 표시 ----------
  const willFailAfterAction = (pos, action, mode) => {
    if (action === 'A') {
      return mode === 'super_epic' ? pos + 6 > 15 : pos + 6 > 16;
    } else if (action === 'B') {
      return mode === 'super_epic' ? pos + 3 > 15 : pos + 3 > 16;
    } else if (action === 'C') {
      return mode === 'super_epic' ? pos + 4 > 15 : pos + 4 > 16;
    }
    return false;
  };

  // --------- 보드 위치 시각화 ----------
  const maxPosition = mode === 'unique' ? 17 : 16;
  const positionBoxes = [];
  for (let p = 0; p <= maxPosition; p++) {
    let className = 'pos-box clickable';
    let reward = '';

    if (p === pos) className += ' current-pos';

    if (p === 0) {
      className += ' start-pos';
      reward = '시작';
    } else if (mode === 'super_epic') {
      if (p === 15) {
        className += ' goal';
        reward = '슈퍼에픽';
      } else if (p > 15) {
        className += ' fail';
        reward = '터짐';
      } else if (p >= 10 && p <= 12) {
        className += ' epic';
        reward = '에픽';
      } else {
        className += ' rare';
        reward = '레어';
      }
    } else {
      if (p === 14 || p === 16) {
        className += ' goal';
        reward = '유니크';
      } else if (p > 16) {
        className += ' fail';
        reward = '터짐';
      } else {
        className += ' epic';
        reward = '에픽';
      }
    }

    positionBoxes.push(
      <div
        key={p}
        className={className}
        title={reward}
        onClick={() => handlePositionClick(p)}
      >
        {p}
      </div>
    );
  }

  const topLabel = mode === 'super_epic' ? '슈퍼에픽' : '유니크';

  return (
    <div className={`App ${darkMode ? 'dark' : ''}`}>
      {/* 상단 확률 박스 */}
      <div className={`info-box ${darkMode ? 'dark' : ''}`}>
        <strong>{topLabel} 획득 확률:</strong>{' '}
        {(currentBest.success * 100).toFixed(1)}%
      </div>

      <h1>🍪 쿠키런: 시즈나이트 추천 시스템</h1>

      <div
        style={{
          textAlign: 'center',
          fontSize: '18px',
          marginTop: '4px',
          marginBottom: '12px',
          opacity: 0.9,
        }}
      >
        <strong>
          ① 사용한 버튼을 누르고, ② 움직인 위치를 선택하세요, ③ 로그가 나오면서 확률이 갱신됩니다.
        </strong>
      </div>

      {/* 도움말 */}
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
            margin: '0 auto',
          }}
        >
          ❓ 사용 방법
        </button>
      </div>

      {showHelp && (
        <div
          style={{
            backgroundColor: darkMode ? '#1e293b' : '#e0f2fe',
            border: `1px solid ${darkMode ? '#4b5563' : '#3b82f6'}`,
            borderRadius: '10px',
            padding: '16px',
            margin: '16px auto',
            maxWidth: '600px',
            fontSize: '14px',
            lineHeight: '1.7',
            color: darkMode ? '#f9fafb' : '#1e40af',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <h3
            style={{
              margin: '0 0 12px 0',
              color: darkMode ? '#60a5fa' : '#1d4ed8',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            사용 방법
          </h3>
          <ol
            style={{
              paddingLeft: '20px',
              marginBottom: '16px',
              marginTop: '0',
            }}
          >
            <li><strong>상급 / 최상급</strong> 중 시즈나이트 등급을 선택합니다.</li>
            <li>현재 게임 화면과 똑같이, 아래 보드에서 <strong>사용한 행동</strong>을 클릭합니다.</li>
            <li>이동한 칸의 숫자를 눌러 선택합니다.</li>
            <li>턴 수, 사용 횟수, 로그, 다음 턴 확률이 자동으로 갱신됩니다.</li>
          </ol>
          <p
            style={{
              fontSize: '12px',
              fontStyle: 'italic',
              margin: '8px 0 0 0',
              color: darkMode ? '#9ca3af' : '#475569',
            }}
          >
            ※ 세게 두드리기(A)는 무제한, 세공하기(B)/안정제 사용(C)은 각각 3회까지 사용 가능<br />
            ※ 목표: 상급 = <strong>15 도달</strong>, 최상급 = <strong>14 또는 16 도달</strong><br />
            ※ 모든 숫자는 동일 확률로 등장한다고 가정합니다.
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
              handleReset();
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
          <button onClick={handleReset} className="reset-btn">
            🔄 초기화
          </button>
        </div>
      </div>

      {/* 상태 패널 */}
      <div className="state-panel">
        <div className="state-item">
          <div className="state-label">📍 현재 위치</div>
          <div className="state-counter">{pos}</div>
        </div>
        <div className="state-item">
          <div className="state-label">⏳ 남은 턴</div>
          <div className="state-counter">{turnsLeft} / 8</div>
        </div>
        <div className="state-item">
          <div className="state-label">세공하기 사용 횟수</div>
          <div className="state-counter b">{3 - bUsed} / 3</div>
        </div>
        <div className="state-item">
          <div className="state-label">안정제 사용 횟수</div>
          <div className="state-counter c">{3 - cUsed} / 3</div>
        </div>
      </div>

      {/* 위치 시각화 */}
      <div className="position-visualizer">{positionBoxes}</div>

      {/* 게임 종료 배너 */}
      {result && (
        <div
          className={`result-banner ${
            result.type === 'success' ? 'success' : 'fail'
          }`}
        >
          <strong>{result.title}</strong> {result.message}{' '}
          {result.grade && <span>(등급: {result.grade})</span>}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="action-buttons">
        {['A', 'B', 'C'].map((action) => {
          const noRemain =
            (action === 'B' && bUsed >= 3) ||
            (action === 'C' && cUsed >= 3);
          const disabled = isGameOver || noRemain || turnsLeft <= 0;
          const willFail = willFailAfterAction(pos, action, mode);
          const isSelected = selectedAction === action;

          return (
            <button
              key={action}
              className={
                `action-btn action-btn-${action}` +
                (disabled ? ' disabled' : '') +
                (willFail ? ' risky' : ' safe') +
                (isSelected ? ' selected' : '')
              }
              onClick={() => !disabled && handleSelectAction(action)}
            >
              {action === 'A' && '세게 두드리기 (+3~+6)'}
              {action === 'B' && '세공하기 (-3~+2)'}
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

      {/* 로그 */}
      {logs.length > 0 && (
        <div className="log-panel">
          <h3>📜 이번 판 로그</h3>
          <ul>
            {logs.map((log, idx) => (
              <li key={idx}>
                <strong>{log.turn}턴</strong> —{' '}
                <strong>{ACTION_LABEL[log.action]}</strong> 사용:&nbsp;
                {log.from} → {log.to}&nbsp;
                <span style={{ opacity: 0.8 }}>
                  ({log.delta >= 0 ? `+${log.delta}` : log.delta})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 최적 액션 */}
      {bestActions.length > 0 && !isGameOver && (
        <div className="best-action">
          💡 최적 액션:
          {bestActions.map((a, i) => (
            <span key={i} style={{ fontWeight: 'bold', margin: '0 4px' }}>
              {ACTION_LABEL[a.action]}{' '}
              ({(a.prob * 100).toFixed(1)}%)
            </span>
          ))}
        </div>
      )}


      <footer className={darkMode ? 'dark' : ''}>
        Feedback은 오픈채팅{' '}
        <a
          href="https://open.kakao.com/o/sBd2uO0h"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#3b82f6',
            fontWeight: 'bold',
            textDecoration: 'underline',
          }}
        >
          타디스
        </a>
        를 찾아주세요.
      </footer>
    </div>
  );
}

export default App;
