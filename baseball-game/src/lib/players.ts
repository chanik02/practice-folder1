/**
 * 선수 데이터 생성 및 관리
 * - 30명의 랜덤 선수 생성
 * - 선수 정보 조회
 */

export interface Player {
  id: string;
  name: string;
  position: string;
  avatarColor: string;
}

/**
 * 랜덤 알파벳 조합으로 선수 이름을 생성합니다
 * 예: "XYZAB", "MNPQR" 등
 */
function generateRandomName(): string {
  const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
  const vowels = "AEIOU";
  const length = Math.random() > 0.5 ? 5 : 6; // 5~6글자
  let name = "";

  for (let i = 0; i < length; i++) {
    if (i % 2 === 0) {
      // 자음
      name += consonants[Math.floor(Math.random() * consonants.length)];
    } else {
      // 모음
      name += vowels[Math.floor(Math.random() * vowels.length)];
    }
  }

  return name;
}

/**
 * 포지션 목록
 */
const POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

/**
 * 아바타 색상 목록 (총 10가지)
 */
const AVATAR_COLORS = [
  "#FF6B6B", // 빨강
  "#4ECDC4", // 민트
  "#45B7D1", // 파랑
  "#FFA07A", // 살몬
  "#98D8C8", // 에메랄드
  "#F7DC6F", // 노랑
  "#BB8FCE", // 보라
  "#85C1E2", // 하늘
  "#F8B195", // 주황
  "#A8D8EA", // 라벤더
];

/**
 * 30명의 선수를 생성합니다
 * 이 함수는 초기화 시에만 호출됩니다
 */
export function generatePlayers(count: number = 30): Player[] {
  const players: Player[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let name: string;
    
    // 중복되지 않은 이름 생성
    do {
      name = generateRandomName();
    } while (usedNames.has(name));
    usedNames.add(name);

    const position = POSITIONS[i % POSITIONS.length];
    const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];

    players.push({
      id: `player_${i + 1}`,
      name,
      position,
      avatarColor,
    });
  }

  return players;
}

/**
 * 선수 목록을 반환합니다 (DB에서 가져온다고 가정)
 * 실제로는 데이터베이스에서 조회할 것
 */
export function getPlayers(): Player[] {
  // 이것은 모의 데이터입니다.
  // 실제로는 Prisma를 통해 DB에서 조회합니다.
  return generatePlayers(30);
}

/**
 * ID로 선수를 찾습니다
 */
export function getPlayerById(playerId: string): Player | null {
  const players = getPlayers();
  return players.find((p) => p.id === playerId) || null;
}

/**
 * 선수를 이름으로 검색합니다
 */
export function searchPlayers(query: string): Player[] {
  const players = getPlayers();
  const lowerQuery = query.toLowerCase();
  return players.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.position.toLowerCase().includes(lowerQuery)
  );
}

/**
 * 위치별 선수를 필터링합니다
 */
export function getPlayersByPosition(position: string): Player[] {
  const players = getPlayers();
  return players.filter((p) => p.position === position);
}
