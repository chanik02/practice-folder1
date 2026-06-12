/**
 * POST /api/games/[gameId]/swing
 * 사용자의 스윙을 기록하고 결과를 계산합니다
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractToken, verifyToken } from "@/lib/auth";
import { successResponse, errorResponse, HTTP_STATUS } from "@/lib/apiResponse";
import {
  detectHit,
  calculateSwingResult,
  getGameStats,
} from "@/lib/gameLogic";

interface SwingBody {
  pitchType: string;
  pitchZoneX: number;
  pitchZoneY: number;
  targetX: number;
  targetY: number;
  swingSpeed: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
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
    const gameId = params.gameId;
    const body: SwingBody = await request.json();

    // 입력값 검증
    if (
      body.pitchZoneX === undefined ||
      body.pitchZoneY === undefined ||
      body.targetX === undefined ||
      body.targetY === undefined ||
      body.swingSpeed === undefined
    ) {
      return NextResponse.json(
        errorResponse("INVALID_INPUT", "필수 입력값이 부족합니다"),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 게임 조회
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        swings: {
          select: { id: true },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "게임을 찾을 수 없습니다"),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // 사용자 권한 확인
    if (game.userId !== userId) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "접근 권한이 없습니다"),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // 게임 종료 확인
    if (game.swings.length >= 15) {
      return NextResponse.json(
        errorResponse("GAME_OVER", "게임이 이미 종료되었습니다"),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // 타격 판정 및 점수 계산
    const pitch = {
      type: body.pitchType,
      zoneX: body.pitchZoneX,
      zoneY: body.pitchZoneY,
    };

    const swing = {
      targetX: body.targetX,
      targetY: body.targetY,
      swingSpeed: body.swingSpeed,
    };

    const isHit = detectHit(pitch, swing);
    const result = calculateSwingResult(pitch, swing, isHit);

    // 타격 결과 저장
    const swingRecord = await prisma.swingResult.create({
      data: {
        gameId,
        pitchType: body.pitchType,
        pitchZoneX: body.pitchZoneX,
        pitchZoneY: body.pitchZoneY,
        hitZoneX: body.targetX,
        hitZoneY: body.targetY,
        isHit: result.isHit,
        flyDistance: result.flyDistance,
        launchAngle: result.launchAngle,
        score: result.score,
      },
    });

    // 게임 정보 업데이트
    const newHitCount = result.isHit ? game.hitCount + 1 : game.hitCount;
    const newTotalScore = game.totalScore + result.score;

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        totalScore: newTotalScore,
        pitchesThrown: game.swings.length + 1,
        hitCount: newHitCount,
      },
    });

    // 게임 종료 여부 확인
    const isGameFinished = game.swings.length + 1 >= 15;

    // 게임이 끝났으면 점수 기록 업데이트
    if (isGameFinished) {
      const userScore = await prisma.score.findUnique({
        where: { userId },
      });

      if (userScore) {
        const newGameCount = userScore.gameCount + 1;
        const newTotalScore = userScore.totalScore + newTotalScore;
        const newBestScore = Math.max(userScore.bestScore, newTotalScore);
        const newAverageScore = newTotalScore / newGameCount;

        await prisma.score.update({
          where: { userId },
          data: {
            gameCount: newGameCount,
            totalScore: newTotalScore,
            bestScore: newBestScore,
            averageScore: newAverageScore,
          },
        });
      }

      // 게임 종료 시간 기록
      await prisma.game.update({
        where: { id: gameId },
        data: { endedAt: new Date() },
      });
    }

    return NextResponse.json(
      successResponse(
        {
          swingId: swingRecord.id,
          result: {
            isHit: result.isHit,
            flyDistance: result.flyDistance,
            launchAngle: result.launchAngle,
            score: result.score,
          },
          gameProgress: {
            pitchNumber: game.swings.length + 1,
            totalPitches: 15,
            currentScore: newTotalScore,
            hitCount: newHitCount,
          },
          gameFinished: isGameFinished,
          ...(isGameFinished && {
            finalStats: {
              totalScore: newTotalScore,
              hitRate: (newHitCount / 15) * 100,
              hitCount: newHitCount,
              missCount: 15 - newHitCount,
            },
          }),
        },
        isGameFinished ? "게임 종료" : "스윙 기록 성공"
      ),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Swing error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "스윙 기록 중 오류가 발생했습니다"),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
