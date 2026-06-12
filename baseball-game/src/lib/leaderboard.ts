/**
 * 리더보드 및 순위 관리
 * - 사용자별 점수 조회
 * - 리더보드 생성
 * - 사용자 순위 계산
 */

export interface UserScore {
  userId: string;
  nickname: string;
  totalScore: number;
  gameCount: number;
  bestScore: number;
  averageScore: number;
}

export interface LeaderboardEntry extends UserScore {
  rank: number;
}

/**
 * 점수 정보를 기반으로 리더보드 항목을 생성합니다
 */
export function createLeaderboardEntry(
  userScore: UserScore,
  rank: number
): LeaderboardEntry {
  return {
    ...userScore,
    rank,
  };
}

/**
 * 여러 사용자의 점수를 기반으로 리더보드를 생성합니다
 * @param userScores 사용자별 점수 배열
 * @returns 순위가 정해진 리더보드
 */
export function generateLeaderboard(userScores: UserScore[]): LeaderboardEntry[] {
  // 총점으로 내림차순 정렬
  const sorted = [...userScores].sort((a, b) => b.totalScore - a.totalScore);

  // 순위 지정 (동일 점수는 같은 순위)
  let rank = 1;
  let previousScore = -1;
  let sameRankCount = 0;

  return sorted.map((score, index) => {
    if (score.totalScore !== previousScore) {
      rank = index + 1;
      sameRankCount = 0;
    } else {
      sameRankCount++;
    }

    previousScore = score.totalScore;

    return createLeaderboardEntry(score, rank);
  });
}

/**
 * 사용자의 순위를 조회합니다
 */
export function getUserRank(
  userId: string,
  leaderboard: LeaderboardEntry[]
): LeaderboardEntry | null {
  return leaderboard.find((entry) => entry.userId === userId) || null;
}

/**
 * 상위 N명의 리더보드를 반환합니다
 */
export function getTopLeaderboard(
  leaderboard: LeaderboardEntry[],
  topN: number = 10
): LeaderboardEntry[] {
  return leaderboard.slice(0, topN);
}

/**
 * 특정 사용자 주변 랭킹을 조회합니다
 * (해당 사용자 상위 2명, 본인, 하위 2명)
 */
export function getAroundLeaderboard(
  userId: string,
  leaderboard: LeaderboardEntry[],
  range: number = 2
): LeaderboardEntry[] {
  const userIndex = leaderboard.findIndex((entry) => entry.userId === userId);
  if (userIndex === -1) {
    return [];
  }

  const start = Math.max(0, userIndex - range);
  const end = Math.min(leaderboard.length, userIndex + range + 1);

  return leaderboard.slice(start, end);
}

/**
 * 사용자 점수를 업데이트합니다
 * (새 게임 결과를 추가)
 */
export function updateUserScore(
  currentScore: UserScore,
  newGameScore: number
): UserScore {
  const newGameCount = currentScore.gameCount + 1;
  const newTotalScore = currentScore.totalScore + newGameScore;
  const newBestScore = Math.max(currentScore.bestScore, newGameScore);
  const newAverageScore = newTotalScore / newGameCount;

  return {
    ...currentScore,
    totalScore: newTotalScore,
    gameCount: newGameCount,
    bestScore: newBestScore,
    averageScore: Math.round(newAverageScore * 100) / 100, // 소수점 2자리
  };
}

/**
 * 점수 통계를 포맷팅합니다 (UI 표시용)
 */
export function formatScoreStats(score: UserScore): {
  totalScore: string;
  gameCount: string;
  bestScore: string;
  averageScore: string;
  winRate: string;
} {
  return {
    totalScore: score.totalScore.toLocaleString(),
    gameCount: score.gameCount.toString(),
    bestScore: score.bestScore.toLocaleString(),
    averageScore: score.averageScore.toFixed(2),
    winRate: "N/A", // 차후 추가 (경쟁 게임모드일 때)
  };
}
