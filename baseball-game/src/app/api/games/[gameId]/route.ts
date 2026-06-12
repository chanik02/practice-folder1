/**
 * GET /api/games/[gameId]
 * 게임 상세 정보를 조회합니다
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractToken, verifyToken } from "@/lib/auth";
import { successResponse, errorResponse, HTTP_STATUS } from "@/lib/apiResponse";

export async function GET(
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

    // 게임 조회
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        swings: {
          select: {
            id: true,
            pitchType: true,
            isHit: true,
            flyDistance: true,
            launchAngle: true,
            score: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
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

    // 게임 통계 계산
    const hitCount = game.swings.filter((s) => s.isHit).length;
    const totalDistance = game.swings.reduce((sum, s) => sum + (s.flyDistance || 0), 0);
    const avgDistance = hitCount > 0 ? totalDistance / hitCount : 0;

    return NextResponse.json(
      successResponse(
        {
          gameId: game.id,
          playerId: game.playerId,
          userId: game.userId,
          status: game.endedAt ? "finished" : "in_progress",
          stats: {
            totalScore: game.totalScore,
            pitchCount: game.swings.length,
            hitCount: hitCount,
            missCount: game.swings.length - hitCount,
            hitRate: game.swings.length > 0 ? (hitCount / game.swings.length) * 100 : 0,
            avgDistance: Math.round(avgDistance * 10) / 10,
          },
          swings: game.swings.map((swing, index) => ({
            pitchNumber: index + 1,
            pitchType: swing.pitchType,
            isHit: swing.isHit,
            flyDistance: swing.flyDistance,
            launchAngle: swing.launchAngle,
            score: swing.score,
          })),
          startedAt: game.startedAt,
          endedAt: game.endedAt,
        },
        "게임 정보 조회 성공"
      ),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Get game error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "게임 조회 중 오류가 발생했습니다"),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
