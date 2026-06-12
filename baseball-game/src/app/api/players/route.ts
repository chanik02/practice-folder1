/**
 * GET /api/players
 * 모든 선수 목록을 조회합니다
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { successResponse, errorResponse, HTTP_STATUS } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  try {
    // 모든 선수 조회
    const players = await prisma.player.findMany({
      select: {
        id: true,
        name: true,
        position: true,
        avatarColor: true,
      },
    });

    if (players.length === 0) {
      // 선수가 없으면 초기화
      const newPlayers = initializePlayers();
      return NextResponse.json(
        successResponse(newPlayers, "선수 목록 조회 성공"),
        { status: HTTP_STATUS.OK }
      );
    }

    return NextResponse.json(
      successResponse(players, "선수 목록 조회 성공"),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Get players error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "선수 목록 조회 중 오류가 발생했습니다"),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * 30명의 선수를 초기화합니다
 */
function initializePlayers() {
  const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
  const vowels = "AEIOU";
  const positions = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
    "#F8B195",
    "#A8D8EA",
  ];

  const players = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < 30; i++) {
    let name: string;

    // 중복되지 않은 이름 생성
    do {
      const length = Math.random() > 0.5 ? 5 : 6;
      name = "";
      for (let j = 0; j < length; j++) {
        if (j % 2 === 0) {
          name += consonants[Math.floor(Math.random() * consonants.length)];
        } else {
          name += vowels[Math.floor(Math.random() * vowels.length)];
        }
      }
    } while (usedNames.has(name));

    usedNames.add(name);

    const position = positions[i % positions.length];
    const avatarColor = colors[i % colors.length];

    players.push({
      id: `player_${i + 1}`,
      name,
      position,
      avatarColor,
    });
  }

  return players;
}
