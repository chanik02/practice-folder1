/**
 * POST /api/games/start
 * 새 게임을 시작합니다
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractToken, verifyToken } from "@/lib/auth";
import { successResponse, errorResponse, HTTP_STATUS } from "@/lib/apiResponse";
import { updateDailyAttempts, consumeAttempt } from "@/lib/dailyAttempts";

interface StartGameBody {
  playerId: string;
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get("authorization");
    const token = extractToken(authHeader);

    if (!token) {
      return NextResponse.json(
        errorResponse("UNAUTHORIZED", "인증 토큰이 필요합니다"),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        errorResponse("UNAUTHORIZED", "유효하지 않은 토큰입니다"),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const userId = decoded.userId;

    // 요청 본문 검증
    const body: StartGameBody = await request.json();
    if (!body.playerId) {
      return NextResponse.json(
        errorResponse("INVALID_INPUT", "선수 ID가 필요합니다"),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 사용자의 일일 기회 확인
    const score = await prisma.score.findUnique({
      where: { userId },
    });

    if (!score) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "사용자 정보를 찾을 수 없습니다"),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // 일일 기회 업데이트
    const attemptState = {
      userId,
      remainingAttempts: score.dailyAttempts,
      lastAttemptUsedAt: score.lastAttemptUsedAt,
      lastResetAt: score.lastResetAt,
    };

    const updated = updateDailyAttempts(attemptState);

    // 기회가 없으면 거부
    if (updated.remainingAttempts <= 0) {
      const nextReset = new Date(updated.lastResetAt);
      nextReset.setDate(nextReset.getDate() + 1);
      nextReset.setHours(0, 0, 0, 0);

      const timeToReset = Math.ceil(
        (nextReset.getTime() - new Date().getTime()) / (1000 * 60)
      );

      return NextResponse.json(
        errorResponse(
          "NO_ATTEMPTS",
          `더 이상 게임을 할 수 없습니다. ${timeToReset}분 후 리셋됩니다`
        ),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // 게임 생성
    const game = await prisma.game.create({
      data: {
        userId,
        playerId: body.playerId,
        totalScore: 0,
        pitchesThrown: 0,
        hitCount: 0,
      },
    });

    // 기회 소비
    const consumed = consumeAttempt(updated);

    // 점수 기록 업데이트
    await prisma.score.update({
      where: { userId },
      data: {
        dailyAttempts: consumed.remainingAttempts,
        lastAttemptUsedAt: consumed.lastAttemptUsedAt,
      },
    });

    return NextResponse.json(
      successResponse(
        {
          gameId: game.id,
          playerId: game.playerId,
          remainingAttempts: consumed.remainingAttempts,
          message: "게임이 시작되었습니다. 15개의 투구를 맞춰보세요!",
        },
        "게임 시작 성공"
      ),
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    console.error("Start game error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "게임 시작 중 오류가 발생했습니다"),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
