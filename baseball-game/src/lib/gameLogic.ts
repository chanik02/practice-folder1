/**
 * 게임 핵심 로직
 * - 투구 생성
 * - 타격 감지 및 점수 계산
 * - 일일 기회 관리
 */

// ============================================
// 1. 투구 타입 및 상수
// ============================================

export enum PitchType {
  FASTBALL = "fastball",      // 직구
  FORK = "fork",              // 포크볼
  SLIDER = "slider",          // 슬라이더
  CHANGEUP = "changeup",      // 체인지업
}

export interface Pitch {
  type: PitchType;
  zoneX: number;              // -0.5 ~ 0.5
  zoneY: number;              // 0.5 ~ 1.5 (투수 입장)
}

export interface SwingInput {
  targetX: number;            // 유저가 친 위치 X
  targetY: number;            // 유저가 친 위치 Y
  swingSpeed: number;         // 0 ~ 100 (스윙 강도)
}

export interface SwingResultData {
  isHit: boolean;
  flyDistance: number;        // 미터 단위
  launchAngle: number;        // 도 단위
  score: number;
}

// ============================================
// 2. 투구 생성 로직
// ============================================

/**
 * 랜덤하게 투구를 생성합니다
 * @returns Pitch 객체
 */
export function generatePitch(): Pitch {
  const pitchTypes = Object.values(PitchType);
  const type = pitchTypes[Math.floor(Math.random() * pitchTypes.length)] as PitchType;

  // 스트라이크 존 내에서 랜덤 위치 생성
  // X: -0.5 ~ 0.5 (좌우)
  // Y: 0.5 ~ 1.5 (상하, 투수 입장)
  const zoneX = Math.random() * 1.0 - 0.5;
  const zoneY = Math.random() * 1.0 + 0.5;

  return { type, zoneX, zoneY };
}

// ============================================
// 3. 타격 감지 및 점수 계산
// ============================================

/**
 * 타격이 공을 맞혔는지 판정합니다
 * @param pitch 투구 위치
 * @param swing 유저 스윙 위치
 * @returns 타격 성공 여부
 */
export function detectHit(pitch: Pitch, swing: SwingInput): boolean {
  // 스트라이크 존과 스윙 위치 간의 거리 계산
  const distanceX = Math.abs(pitch.zoneX - swing.targetX);
  const distanceY = Math.abs(pitch.zoneY - swing.targetY);
  const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

  // 거리가 0.2 이내면 타격 성공 (타이밍과 위치의 정확성 필요)
  const hitRadius = 0.2;
  return distance <= hitRadius;
}

/**
 * 타격 결과를 계산합니다 (비거리, 발사각, 점수)
 * @param pitch 투구 타입
 * @param swing 스윙 데이터
 * @param isHit 타격 성공 여부
 * @returns 타격 결과 (비거리, 발사각, 점수)
 */
export function calculateSwingResult(
  pitch: Pitch,
  swing: SwingInput,
  isHit: boolean
): SwingResultData {
  if (!isHit) {
    return {
      isHit: false,
      flyDistance: 0,
      launchAngle: 0,
      score: 0,
    };
  }

  // 스윙 강도 기반 비거리 계산
  // 스윙 강도 100 = 최대 150m, 스윙 강도 50 = 약 80m
  const baseDistance = 50 + (swing.swingSpeed * 1.0);
  
  // 투구 타입에 따른 보정 (좋은 구종은 더 멀리 나갈 수 있음)
  const pitchModifier = getPitchModifier(pitch.type);
  const flyDistance = baseDistance * pitchModifier;

  // 발사각 계산 (스윙 위치와 투구 위치의 관계)
  const launchAngle = calculateLaunchAngle(pitch, swing);

  // 점수 계산
  const score = calculateScore(flyDistance, launchAngle);

  return {
    isHit: true,
    flyDistance: Math.round(flyDistance * 10) / 10, // 소수점 1자리
    launchAngle: Math.round(launchAngle * 10) / 10,
    score,
  };
}

/**
 * 투구 타입에 따른 타격 보정값
 */
function getPitchModifier(pitchType: PitchType): number {
  switch (pitchType) {
    case PitchType.FASTBALL:
      return 1.1;  // 직구는 맞으면 더 멀리 나감
    case PitchType.FORK:
      return 0.9;  // 포크볼은 약간 약함
    case PitchType.SLIDER:
      return 0.95; // 슬라이더
    case PitchType.CHANGEUP:
      return 0.85; // 체인지업은 가장 약함
    default:
      return 1.0;
  }
}

/**
 * 발사각 계산
 * @param pitch 투구 위치
 * @param swing 스윙 위치
 * @returns 발사각 (도)
 */
function calculateLaunchAngle(pitch: Pitch, swing: SwingInput): number {
  // 스윙이 투구보다 위쪽이면 상향각, 아래쪽이면 하향각
  const verticalDifference = swing.targetY - pitch.zoneY;
  
  // 수평 거리와 수직 거리를 이용하여 발사각 계산
  const horizontalDifference = swing.targetX - pitch.zoneX;
  
  // 발사각: -45 ~ 45도 범위
  const angle = Math.atan2(verticalDifference, horizontalDifference) * (180 / Math.PI);
  
  // 범위 제한
  return Math.max(-45, Math.min(45, angle));
}

/**
 * 비거리와 발사각으로 점수를 계산합니다
 * - 비거리: 100m = 100점, 150m = 200점 등
 * - 발사각: 40도 근처가 이상적 (최고 점수)
 */
function calculateScore(flyDistance: number, launchAngle: number): number {
  // 기본 거리 점수 (10m당 10점, 최소 10점)
  const distanceScore = Math.max(10, Math.round(flyDistance));

  // 발사각 보정 (35 ~ 45도가 이상적)
  const idealAngle = 40;
  const angleDifference = Math.abs(launchAngle - idealAngle);
  const angleMultiplier = Math.max(0.5, 1 - angleDifference / 100);

  const finalScore = Math.round(distanceScore * angleMultiplier);
  return finalScore;
}

// ============================================
// 4. 일일 기회 관리 로직
// ============================================

/**
 * 일일 기회 갱신 및 회복
 * 시간당 1번 회복 (최대 5번)
 */
export interface DailyAttemptState {
  attempts: number;           // 현재 남은 기회
  lastResetTime: Date;        // 마지막 리셋 시간 (자정)
  lastUsedTime: Date | null;  // 마지막 기회 사용 시간
}

/**
 * 일일 기회를 업데이트합니다
 * @param state 현재 기회 상태
 * @returns 업데이트된 기회 상태
 */
export function updateDailyAttempts(state: DailyAttemptState): DailyAttemptState {
  const now = new Date();
  
  // 자정이 넘었으면 리셋
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  
  if (state.lastResetTime < todayMidnight) {
    return {
      attempts: 5,
      lastResetTime: todayMidnight,
      lastUsedTime: null,
    };
  }

  // 시간 경과에 따른 기회 회복
  let recoveredAttempts = state.attempts;
  
  if (state.lastUsedTime) {
    const timeDiffMs = now.getTime() - state.lastUsedTime.getTime();
    const hoursPassed = Math.floor(timeDiffMs / (1000 * 60 * 60));
    
    recoveredAttempts = Math.min(5, state.attempts + hoursPassed);
  }

  return {
    attempts: recoveredAttempts,
    lastResetTime: state.lastResetTime,
    lastUsedTime: state.lastUsedTime,
  };
}

/**
 * 게임을 할 수 있는지 확인합니다
 */
export function canPlayGame(state: DailyAttemptState): boolean {
  const updated = updateDailyAttempts(state);
  return updated.attempts > 0;
}

/**
 * 기회를 소비합니다
 */
export function consumeAttempt(state: DailyAttemptState): DailyAttemptState {
  const updated = updateDailyAttempts(state);
  
  return {
    attempts: Math.max(0, updated.attempts - 1),
    lastResetTime: updated.lastResetTime,
    lastUsedTime: new Date(),
  };
}

// ============================================
// 5. 게임 세션 로직
// ============================================

export interface GameSession {
  gameId: string;
  userId: string;
  playerId: string;
  totalScore: number;
  pitches: SwingResultData[];
  currentPitchIndex: number;
}

/**
 * 새 게임 세션을 시작합니다
 */
export function createGameSession(gameId: string, userId: string, playerId: string): GameSession {
  return {
    gameId,
    userId,
    playerId,
    totalScore: 0,
    pitches: [],
    currentPitchIndex: 0,
  };
}

/**
 * 게임에 스윙 결과를 추가하고 총점을 업데이트합니다
 */
export function addSwingToGame(session: GameSession, swingResult: SwingResultData): GameSession {
  return {
    ...session,
    pitches: [...session.pitches, swingResult],
    totalScore: session.totalScore + swingResult.score,
    currentPitchIndex: session.currentPitchIndex + 1,
  };
}

/**
 * 게임이 종료되었는지 확인합니다 (15개 투구)
 */
export function isGameFinished(session: GameSession): boolean {
  return session.pitches.length >= 15;
}

/**
 * 게임 통계를 계산합니다
 */
export function getGameStats(session: GameSession) {
  const hitCount = session.pitches.filter((p) => p.isHit).length;
  const totalDistance = session.pitches.reduce((sum, p) => sum + p.flyDistance, 0);
  const avgDistance = hitCount > 0 ? totalDistance / hitCount : 0;

  return {
    totalScore: session.totalScore,
    pitchCount: session.pitches.length,
    hitCount,
    missCount: session.pitches.length - hitCount,
    hitRate: (hitCount / session.pitches.length) * 100,
    avgDistance: Math.round(avgDistance * 10) / 10,
  };
}
