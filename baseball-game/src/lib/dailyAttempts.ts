/**
 * 일일 게임 기회 관리 시스템
 * - 5번의 일일 기회
 * - 매시간 1번 회복
 * - 자정에 리셋
 */

export interface DailyAttemptState {
  userId: string;
  remainingAttempts: number;      // 남은 기회 (0~5)
  lastAttemptUsedAt: Date | null; // 마지막 기회 사용 시간
  lastResetAt: Date;              // 마지막 리셋 시간 (자정)
}

/**
 * 새 사용자의 일일 기회 상태를 초기화합니다
 */
export function initializeDailyAttempts(userId: string): DailyAttemptState {
  return {
    userId,
    remainingAttempts: 5,
    lastAttemptUsedAt: null,
    lastResetAt: getTodayMidnight(),
  };
}

/**
 * 현재 시간의 자정을 반환합니다
 */
export function getTodayMidnight(): Date {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  return midnight;
}

/**
 * 자정이 지났는지 확인합니다
 */
function isMidnightPassed(lastResetAt: Date): boolean {
  const todayMidnight = getTodayMidnight();
  return lastResetAt < todayMidnight;
}

/**
 * 경과한 시간(시간 단위)을 계산합니다
 */
function getHoursElapsed(fromDate: Date, toDate: Date): number {
  const diffMs = toDate.getTime() - fromDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * 시간 경과에 따른 기회 회복을 계산합니다
 * 1시간마다 1번 회복 (최대 5번)
 */
function calculateRecoveredAttempts(
  currentAttempts: number,
  lastAttemptUsedAt: Date | null
): number {
  if (lastAttemptUsedAt === null) {
    // 아직 게임을 하지 않은 사용자 (항상 5개)
    return 5;
  }

  const now = new Date();
  const hoursElapsed = getHoursElapsed(lastAttemptUsedAt, now);
  
  // 시간당 1번씩 회복
  const recoveredAttempts = Math.min(5, currentAttempts + hoursElapsed);
  
  return recoveredAttempts;
}

/**
 * 일일 기회 상태를 갱신합니다
 * - 자정이 지났으면 5개로 리셋
 * - 아니면 경과 시간에 따라 회복
 */
export function updateDailyAttempts(
  state: DailyAttemptState
): DailyAttemptState {
  const now = new Date();

  // 자정이 지났으면 리셋
  if (isMidnightPassed(state.lastResetAt)) {
    return {
      ...state,
      remainingAttempts: 5,
      lastAttemptUsedAt: null,
      lastResetAt: getTodayMidnight(),
    };
  }

  // 아니면 시간 경과에 따라 회복
  const recovered = calculateRecoveredAttempts(
    state.remainingAttempts,
    state.lastAttemptUsedAt
  );

  return {
    ...state,
    remainingAttempts: recovered,
  };
}

/**
 * 게임을 할 수 있는지 확인합니다
 */
export function canPlayGame(state: DailyAttemptState): boolean {
  const updated = updateDailyAttempts(state);
  return updated.remainingAttempts > 0;
}

/**
 * 기회를 소비합니다
 */
export function consumeAttempt(state: DailyAttemptState): DailyAttemptState {
  const updated = updateDailyAttempts(state);

  if (updated.remainingAttempts <= 0) {
    throw new Error("No remaining attempts for today");
  }

  return {
    ...updated,
    remainingAttempts: updated.remainingAttempts - 1,
    lastAttemptUsedAt: new Date(),
  };
}

/**
 * 다음 기회까지 남은 시간을 계산합니다 (분 단위)
 * null이면 기회가 남아 있음
 */
export function getTimeToNextAttempt(
  state: DailyAttemptState
): number | null {
  const updated = updateDailyAttempts(state);

  // 기회가 남아 있으면 null
  if (updated.remainingAttempts > 0) {
    return null;
  }

  // 자정까지 남은 시간
  const now = new Date();
  const todayMidnight = getTodayMidnight();
  const tomorrowMidnight = new Date(todayMidnight);
  tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);

  const diffMs = tomorrowMidnight.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60)); // 분 단위, 올림
}

/**
 * 기회 복구까지 남은 시간을 계산합니다 (분 단위)
 * 모든 기회가 찬 경우 null
 */
export function getTimeToRecovery(
  state: DailyAttemptState
): number | null {
  const updated = updateDailyAttempts(state);

  // 이미 5개면 회복할 필요 없음
  if (updated.remainingAttempts >= 5) {
    return null;
  }

  // 마지막 사용 시간이 없으면 기회가 있다는 뜻
  if (updated.lastAttemptUsedAt === null) {
    return null;
  }

  const now = new Date();
  const nextRecoveryTime = new Date(updated.lastAttemptUsedAt);
  nextRecoveryTime.setHours(nextRecoveryTime.getHours() + 1);

  const diffMs = nextRecoveryTime.getTime() - now.getTime();
  
  // 이미 시간이 지났으면 updateDailyAttempts에서 반영됨
  if (diffMs <= 0) {
    return null;
  }

  return Math.ceil(diffMs / (1000 * 60)); // 분 단위, 올림
}

/**
 * 상태를 문자열로 포맷합니다 (UI 표시용)
 */
export function formatAttemptStatus(state: DailyAttemptState): string {
  const updated = updateDailyAttempts(state);

  if (updated.remainingAttempts > 0) {
    return `${updated.remainingAttempts}/5 기회 남음`;
  }

  const timeToNext = getTimeToNextAttempt(state);
  if (timeToNext !== null) {
    const hours = Math.floor(timeToNext / 60);
    const minutes = timeToNext % 60;
    return `내일 자정에 리셋 (${hours}시간 ${minutes}분)`;
  }

  return "게임 기회 없음";
}

/**
 * 기회 상태를 상세 정보로 반환합니다
 */
export function getAttemptDetails(state: DailyAttemptState) {
  const updated = updateDailyAttempts(state);
  const timeToNext = getTimeToNextAttempt(state);
  const timeToRecovery = getTimeToRecovery(state);

  return {
    remaining: updated.remainingAttempts,
    total: 5,
    canPlay: updated.remainingAttempts > 0,
    timeToNextAttempt: timeToNext, // 분 단위 또는 null
    timeToRecovery: timeToRecovery, // 분 단위 또는 null
    lastUsedAt: updated.lastAttemptUsedAt,
    lastResetAt: updated.lastResetAt,
  };
}
