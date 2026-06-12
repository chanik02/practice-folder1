
# ⚾ 야구 게임 프로젝트 - 핵심 로직 & 데이터베이스 가이드

## 📋 프로젝트 개요

소셜 미니 게임 플랫폼의 야구 게임입니다. 사용자가 선수를 선택하고, 투수의 다양한 구종을 맞혀 비거리로 점수를 환산하는 게임입니다.

**핵심 기능:**
- ⚾ 15개 투구 타격 (4가지 구종: 직구, 포크볼, 슬라이더, 체인지업)
- 🎯 정확한 타격 판정 및 비거리 점수 계산
- 📊 리더보드를 통한 다른 플레이어와의 순위 비교
- ⏰ 하루 5회 게임 기회 (시간당 1회 회복, 자정 리셋)
- 👥 30명의 랜덤 선수 선택 가능

---

## 📁 파일 구조

```
baseball-game/
├── prisma/
│   └── schema.prisma           # 데이터베이스 스키마
├── src/
│   └── lib/
│       ├── gameLogic.ts        # 게임 핵심 로직
│       ├── players.ts          # 선수 생성 및 관리
│       ├── leaderboard.ts      # 리더보드 및 순위
│       └── dailyAttempts.ts    # 일일 기회 관리
└── README.md                   # 이 파일
```

---

## 🗂️ 데이터베이스 스키마 (`schema.prisma`)

### 📌 핵심 테이블

#### 1. **User 테이블** - 사용자 정보
```typescript
model User {
  id        String     // 고유 ID
  email     String     // 이메일 (로그인용)
  nickname  String     // 닉네임 (고유)
  password  String     // 암호화된 비밀번호
  games     Game[]     // 참조: 플레이한 게임 목록
  scores    Score[]    // 참조: 점수 기록
}
```

#### 2. **Player 테이블** - 선수 정보 (30명)
```typescript
model Player {
  id          String     // 고유 ID (player_1 ~ player_30)
  name        String     // 알파벳 랜덤 조합 (예: "ABCDE", "XYZAB")
  position    String     // 포지션 (C, 1B, 2B, 3B, SS, LF, CF, RF, DH)
  avatarColor String     // UI 색상 구분용
}
```

#### 3. **Game 테이블** - 게임 세션
```typescript
model Game {
  id              String          // 게임 세션 ID
  userId          String          // 어느 사용자가 플레이했는가
  playerId        String          // 선택한 선수
  totalScore      Int             // 총점
  pitchesThrown   Int             // 던져진 공 개수 (0~15)
  hitCount        Int             // 맞힌 횟수
  swings          SwingResult[]   // 각 타격 기록
  startedAt       DateTime        // 게임 시작 시간
  endedAt         DateTime?       // 게임 종료 시간
}
```

#### 4. **SwingResult 테이블** - 각 타격 결과
```typescript
model SwingResult {
  id              String     // 고유 ID
  gameId          String     // 어느 게임의 타격
  
  // 투구 정보
  pitchType       String     // "fastball", "fork", "slider", "changeup"
  pitchZoneX      Float      // 스트라이크 존 X위치 (-0.5 ~ 0.5)
  pitchZoneY      Float      // 스트라이크 존 Y위치 (0.5 ~ 1.5)
  
  // 타격 정보
  hitZoneX        Float?     // 사용자 스윙 X위치
  hitZoneY        Float?     // 사용자 스윙 Y위치
  isHit           Boolean    // 공을 쳤는가?
  
  // 타구 결과
  flyDistance     Float?     // 비거리 (미터)
  launchAngle     Float?     // 발사각 (도)
  score           Int        // 이 타격의 점수
  createdAt       DateTime   // 타격 시간
}
```

#### 5. **Score 테이블** - 사용자 누적 점수
```typescript
model Score {
  userId              String  // 사용자 ID (고유)
  totalScore          Int     // 누적 총점
  gameCount           Int     // 플레이한 게임 수
  bestScore           Int     // 최고 점수
  averageScore        Float   // 평균 점수
  
  // 일일 기회 관리
  dailyAttempts       Int     // 오늘 남은 기회 (0~5)
  lastResetAt         DateTime// 마지막 리셋 시간 (자정)
  lastAttemptUsedAt   DateTime?// 마지막 기회 사용 시간
}
```

#### 6. **Leaderboard 테이블** - 리더보드 캐시
```typescript
model Leaderboard {
  userId          String  // 사용자 ID (고유)
  userNickname    String  // 닉네임
  rank            Int     // 현재 순위
  totalScore      Int     // 총점
  gameCount       Int     // 게임 수
  bestScore       Int     // 최고 점수
  averageScore    Float   // 평균 점수
  updatedAt       DateTime// 마지막 업데이트
}
```

---

## 🎮 게임 로직 (`gameLogic.ts`)

### 투구 시스템
```typescript
// 1. 투구 생성
const pitch = generatePitch();
// → {type: "fastball", zoneX: 0.1, zoneY: 1.2}
```

**투구 타입:**
- `fastball` (직구): 배수 1.1x
- `fork` (포크볼): 배수 0.9x
- `slider` (슬라이더): 배수 0.95x
- `changeup` (체인지업): 배수 0.85x

**스트라이크 존:**
- X축: -0.5 ~ 0.5 (좌우)
- Y축: 0.5 ~ 1.5 (상하, 투수 입장에서)

### 타격 판정
```typescript
const swing = {
  targetX: 0.05,        // 사용자가 친 위치
  targetY: 1.1,
  swingSpeed: 75        // 스윙 강도 (0~100)
};

const isHit = detectHit(pitch, swing);
// 거리 0.2 이내면 타격 성공
```

### 점수 계산
```typescript
const result = calculateSwingResult(pitch, swing, isHit);
// → {
//   isHit: true,
//   flyDistance: 120.5,  // 미터
//   launchAngle: 35.2,   // 도
//   score: 120           // 비거리 + 발사각 보정
// }
```

**점수 계산 공식:**
- 기본 거리 점수: 비거리(m) = 기본 점수
- 발사각 보정: 40도 근처(35~45도)가 최고 점수
- 최종 점수 = 거리점수 × (발사각 배수)

**비거리 계산:**
- 스윙 강도 100 & 직구 → 약 150m
- 스윙 강도 50 & 체인지업 → 약 50m

---

## 👥 선수 관리 (`players.ts`)

### 선수 생성
```typescript
// 초기화할 때 한 번 실행
const players = generatePlayers(30);
// → 30명의 랜덤 선수 생성

// 각 선수의 구조:
// {
//   id: "player_1",
//   name: "ABCDE",          // 5~6글자 랜덤 알파벳
//   position: "1B",         // 9개 포지션 중 하나
//   avatarColor: "#FF6B6B"  // 10가지 색상 중 하나
// }
```

### 선수 조회
```typescript
const player = getPlayerById("player_1");
const byPosition = getPlayersByPosition("SS");
const search = searchPlayers("ABC");
```

---

## 📊 리더보드 (`leaderboard.ts`)

### 리더보드 생성
```typescript
const userScores = [
  { userId: "user1", nickname: "Player1", totalScore: 500, ... },
  { userId: "user2", nickname: "Player2", totalScore: 450, ... },
  // ...
];

const leaderboard = generateLeaderboard(userScores);
// → 순위가 정해진 리더보드
```

### 순위 조회
```typescript
// 상위 10명
const top10 = getTopLeaderboard(leaderboard, 10);

// 특정 사용자 주변 (±2명)
const around = getAroundLeaderboard(userId, leaderboard, 2);

// 특정 사용자의 순위
const userRank = getUserRank(userId, leaderboard);
```

### 점수 업데이트
```typescript
const newScore = updateUserScore(currentScore, 320);
// → gameCount +1, totalScore +320, bestScore 갱신, averageScore 재계산
```

---

## ⏰ 일일 기회 관리 (`dailyAttempts.ts`)

### 기회 시스템
- **초기**: 하루 5회 기회
- **회복**: 매시간 1회 회복 (최대 5회)
- **리셋**: 자정(00:00)에 전체 리셋

### 사용 예시
```typescript
let attemptState = initializeDailyAttempts(userId);
// → { remainingAttempts: 5, lastAttemptUsedAt: null, ... }

// 게임을 할 수 있는가?
if (canPlayGame(attemptState)) {
  // 게임 시작
  attemptState = consumeAttempt(attemptState);
  // → remainingAttempts: 4
  // → lastAttemptUsedAt: now()
}

// 다음 기회 회복까지 남은 시간
const timeToRecovery = getTimeToRecovery(attemptState);
// → 30 (분 단위, 또는 null)

// 자정까지 남은 시간
const timeToMidnight = getTimeToNextAttempt(attemptState);
// → 360 (분 단위, 또는 null)
```

### 상태 포맷팅
```typescript
const status = formatAttemptStatus(attemptState);
// → "4/5 기회 남음" 또는 "내일 자정에 리셋 (2시간 30분)"

const details = getAttemptDetails(attemptState);
// → {
//   remaining: 4,
//   total: 5,
//   canPlay: true,
//   timeToNextAttempt: null,
//   timeToRecovery: 30,
//   ...
// }
```

---

## 🎯 게임 플로우

```
1. 사용자 로그인
   ↓
2. 선수 선택 (30명 중 1명)
   ↓
3. 일일 기회 확인 (canPlayGame)
   ↓
4. 게임 시작 (createGameSession)
   ↓
5. 15번 반복:
   a) 투구 생성 (generatePitch)
   b) 사용자 스윙 입력 (SwingInput)
   c) 타격 판정 (detectHit)
   d) 점수 계산 (calculateSwingResult)
   e) 게임에 추가 (addSwingToGame)
   f) totalScore 누적
   ↓
6. 게임 종료 (isGameFinished)
   ↓
7. 게임 저장 (DB에 Game, SwingResult 저장)
   ↓
8. 점수 업데이트 (updateUserScore)
   ↓
9. 리더보드 갱신 (generateLeaderboard)
   ↓
10. 기회 소비 (consumeAttempt)
```

---

## 📈 통계 계산

### 게임 통계
```typescript
const stats = getGameStats(gameSession);
// → {
//   totalScore: 1200,
//   pitchCount: 15,
//   hitCount: 12,
//   missCount: 3,
//   hitRate: 80.0,          // %
//   avgDistance: 95.3       // 미터
// }
```

### 누적 통계
```typescript
const score: UserScore = {
  userId: "user1",
  nickname: "Player1",
  totalScore: 5000,
  gameCount: 10,
  bestScore: 1200,
  averageScore: 500.0
};
```

---

## 🔐 데이터 무결성

- **User**: email, nickname 고유
- **Player**: name 고유 (자동 생성 시 중복 제거)
- **Score**: userId 고유 (사용자당 1개 점수 기록)
- **Leaderboard**: userId 고유 (매일 갱신)

---

## 🚀 다음 단계

이 핵심 로직을 기반으로 다음을 구현할 수 있습니다:

1. **인증 시스템** (회원가입, 로그인)
2. **API 서버** (Next.js API Routes 또는 Express)
3. **프론트엔드 UI** (React 컴포넌트)
4. **게임 캔버스** (HTML5 Canvas 또는 Three.js)
5. **실시간 협력** (WebSocket)
6. **푸시 알림** (기회 회복, 순위 변동)

---

## 📝 주요 설정값

| 항목 | 값 | 비고 |
|------|-----|------|
| 총 투구 수 | 15 | 고정 |
| 일일 기회 | 5 | 초기값 |
| 시간당 회복 | 1 | 최대 5 |
| 선수 수 | 30 | 고정 |
| 포지션 종류 | 9 | C, 1B, 2B, 3B, SS, LF, CF, RF, DH |
| 구종 종류 | 4 | 직구, 포크볼, 슬라이더, 체인지업 |
| 타격 판정 반경 | 0.2 | 스트라이크 존 기준 |
| 최대 비거리 | ~150m | 스윙강도 100 + 직구 + 이상적 각도 |

---

좋은 게임 개발을 기원합니다! ⚾🎮
