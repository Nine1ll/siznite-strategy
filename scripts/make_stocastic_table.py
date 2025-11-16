import json
from functools import lru_cache

# --- 설정 ---
MODES = ["super_epic", "unique"]
ACTION_A = list(range(3, 7))      # +3~+6
ACTION_B = list(range(-3, 3))     # -3~+2 
ACTION_C = list(range(0, 5))      # 0~+4

def is_success(pos, mode):
    if mode == "super_epic": 
        return pos == 15
    if mode == "unique": 
        return pos in (14, 16)
    return False

def is_failure(pos, mode):
    if mode == "super_epic": 
        return pos > 15   # 15 초과 즉시 실패
    if mode == "unique": 
        return pos > 17
    return False

# --- DP 함수 (메모이제이션) ---
@lru_cache(maxsize=None)
def dp(pos, turns_left, b_left, c_left, mode):
    # 위치는 음수가 될 수 없음 → 0으로 클램핑
    pos = max(0, pos)

    # 🔴 15(또는 16) 초과 시 즉시 실패 (더 이상 주사위 안 굴림)
    if is_failure(pos, mode):
        return 0.0  # 성공 확률 기준이므로 0

    # 더 던질 수 없으면 현재 위치로 성공/실패 판정
    if turns_left == 0:
        return 1.0 if is_success(pos, mode) else 0.0

    best = 0.0

    # A: 항상 가능
    prob_a = sum(
        dp(pos + s, turns_left - 1, b_left, c_left, mode) 
        for s in ACTION_A
    ) / len(ACTION_A)
    best = max(best, prob_a)

    # B: b_left > 0일 때만 가능
    if b_left > 0:
        prob_b = sum(
            dp(pos + s, turns_left - 1, b_left - 1, c_left, mode) 
            for s in ACTION_B
        ) / len(ACTION_B)
        best = max(best, prob_b)

    # C: c_left > 0일 때만 가능
    if c_left > 0:
        prob_c = sum(
            dp(pos + s, turns_left - 1, b_left, c_left - 1, mode) 
            for s in ACTION_C
        ) / len(ACTION_C)
        best = max(best, prob_c)

    return best

# --- 실패 확률 계산 함수 ---
@lru_cache(maxsize=None)
def dp_fail(pos, turns_left, b_left, c_left, mode):
    # 위치는 음수가 될 수 없음 → 0으로 클램핑
    pos = max(0, pos)

    # 🔴 15(또는 16) 초과 시 즉시 실패 확률 100%
    if is_failure(pos, mode):
        return 1.0

    # 더 던질 수 없으면 현재 위치로 실패/성공 판정
    if turns_left == 0:
        return 1.0 if is_failure(pos, mode) else 0.0

    worst = 0.0  # 실패 확률은 "가장 실패 확률이 높은 선택" 기준

    # A
    fail_a = sum(
        dp_fail(pos + s, turns_left - 1, b_left, c_left, mode) 
        for s in ACTION_A
    ) / len(ACTION_A)
    worst = max(worst, fail_a)

    # B
    if b_left > 0:
        fail_b = sum(
            dp_fail(pos + s, turns_left - 1, b_left - 1, c_left, mode) 
            for s in ACTION_B
        ) / len(ACTION_B)
        worst = max(worst, fail_b)

    # C
    if c_left > 0:
        fail_c = sum(
            dp_fail(pos + s, turns_left - 1, b_left, c_left - 1, mode) 
            for s in ACTION_C
        ) / len(ACTION_C)
        worst = max(worst, fail_c)

    return worst

# --- 테이블 생성 ---
print("확률 계산 중... (약 1~3초)")
policy_table = {}

pos_min, pos_max = 0, 48  # 안전 범위 (0~48)

for mode in MODES:
    for turns in range(1, 9):          # 1~8
        for b in range(0, 4):          # 0~3
            for c in range(0, 4):      # 0~3
                for pos in range(pos_min, pos_max + 1):
                    # pos는 루프 변수 그대로 사용, 별도 보정만
                    cur_pos = max(0, pos)

                    # 액션별 확률 계산
                    options = {}

                    # A: 항상 가능
                    prob_a = sum(
                        dp(cur_pos + s, turns - 1, b, c, mode) 
                        for s in ACTION_A
                    ) / len(ACTION_A)
                    fail_a = sum(
                        dp_fail(cur_pos + s, turns - 1, b, c, mode) 
                        for s in ACTION_A
                    ) / len(ACTION_A)
                    options['A'] = {'success': prob_a, 'failure': fail_a}

                    # B: b > 0
                    if b > 0:
                        prob_b = sum(
                            dp(cur_pos + s, turns - 1, b - 1, c, mode) 
                            for s in ACTION_B
                        ) / len(ACTION_B)
                        fail_b = sum(
                            dp_fail(cur_pos + s, turns - 1, b - 1, c, mode) 
                            for s in ACTION_B
                        ) / len(ACTION_B)
                        options['B'] = {'success': prob_b, 'failure': fail_b}
                    else:
                        options['B'] = {'success': 0.0, 'failure': 0.0}

                    # C: c > 0
                    if c > 0:
                        prob_c = sum(
                            dp(cur_pos + s, turns - 1, b, c - 1, mode) 
                            for s in ACTION_C
                        ) / len(ACTION_C)
                        fail_c = sum(
                            dp_fail(cur_pos + s, turns - 1, b, c - 1, mode) 
                            for s in ACTION_C
                        ) / len(ACTION_C)
                        options['C'] = {'success': prob_c, 'failure': fail_c}
                    else:
                        options['C'] = {'success': 0.0, 'failure': 0.0}

                    key = (cur_pos, turns, b, c, mode)
                    policy_table[key] = options

print("✅ 확률 테이블 생성 완료!")
print(f"총 상태 수: {len(policy_table):,}")

# --- (선택) 피클로 저장하고 싶으면 유지 ---
# with open("policy_fix.pkl", "wb") as f:
#     pickle.dump(policy_table, f)
# print("✅ 'policy_fix.pkl' 저장 완료")

# --- ✅ 웹에서 읽기 좋은 JSON으로 변환 ---
json_list = []

for (pos, turns, b_left, c_left, mode), options in policy_table.items():
    json_list.append({
        "pos": pos,
        "turns_left": turns,
        "b_left": b_left,
        "c_left": c_left,
        "mode": mode,
        "A": options.get("A", {"success": 0.0, "failure": 0.0}),
        "B": options.get("B", {"success": 0.0, "failure": 0.0}),
        "C": options.get("C", {"success": 0.0, "failure": 0.0}),
    })

with open("../src/data/culculated_prob.json", "w", encoding="utf-8") as f:
    json.dump(json_list, f, ensure_ascii=False, indent=2)

print("✅ 'culculated_prob.json' 생성 완료!")
