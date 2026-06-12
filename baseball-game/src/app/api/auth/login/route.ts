/**
 * POST /api/auth/login
 * 사용자 로그인
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, generateToken } from "@/lib/auth";
import { successResponse, errorResponse, HTTP_STATUS } from "@/lib/apiResponse";

interface LoginBody {
  email: string;
  password: string;
}

function validateLoginInput(body: LoginBody): string | null {
  if (!body.email) {
    return "이메일을 입력하세요";
  }

  if (!body.password) {
    return "비밀번호를 입력하세요";
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginBody = await request.json();

    // 입력값 검증
    const validationError = validateLoginInput(body);
    if (validationError) {
      return NextResponse.json(
        errorResponse("INVALID_INPUT", validationError),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse("LOGIN_FAILED", "이메일 또는 비밀번호가 올바르지 않습니다"),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // 비밀번호 검증
    const passwordMatch = await verifyPassword(body.password, user.password);

    if (!passwordMatch) {
      return NextResponse.json(
        errorResponse("LOGIN_FAILED", "이메일 또는 비밀번호가 올바르지 않습니다"),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // 사용자 점수 정보 조회
    const score = await prisma.score.findUnique({
      where: { userId: user.id },
    });

    // JWT 토큰 생성
    const token = generateToken(user.id, user.nickname);

    return NextResponse.json(
      successResponse(
        {
          userId: user.id,
          email: user.email,
          nickname: user.nickname,
          token,
          stats: {
            totalScore: score?.totalScore || 0,
            gameCount: score?.gameCount || 0,
            bestScore: score?.bestScore || 0,
            averageScore: score?.averageScore || 0,
          },
        },
        "로그인 성공"
      ),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "로그인 중 오류가 발생했습니다"),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
