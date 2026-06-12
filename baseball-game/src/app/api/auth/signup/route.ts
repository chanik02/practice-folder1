/**
 * POST /api/auth/signup
 * 새 사용자를 등록합니다
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, generateToken } from "@/lib/auth";
import { successResponse, errorResponse, HTTP_STATUS } from "@/lib/apiResponse";

interface SignupBody {
  email: string;
  nickname: string;
  password: string;
  confirmPassword: string;
}

function validateSignupInput(body: SignupBody): string | null {
  if (!body.email || !body.email.includes("@")) {
    return "유효한 이메일을 입력하세요";
  }

  if (!body.nickname || body.nickname.length < 2) {
    return "닉네임은 2글자 이상이어야 합니다";
  }

  if (!body.password || body.password.length < 6) {
    return "비밀번호는 6글자 이상이어야 합니다";
  }

  if (body.password !== body.confirmPassword) {
    return "비밀번호가 일치하지 않습니다";
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body: SignupBody = await request.json();

    // 입력값 검증
    const validationError = validateSignupInput(body);
    if (validationError) {
      return NextResponse.json(
        errorResponse("INVALID_INPUT", validationError),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 이메일 중복 확인
    const existingEmail = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingEmail) {
      return NextResponse.json(
        errorResponse("EMAIL_EXISTS", "이미 사용 중인 이메일입니다"),
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // 닉네임 중복 확인
    const existingNickname = await prisma.user.findUnique({
      where: { nickname: body.nickname },
    });

    if (existingNickname) {
      return NextResponse.json(
        errorResponse("NICKNAME_EXISTS", "이미 사용 중인 닉네임입니다"),
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(body.password);

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email: body.email,
        nickname: body.nickname,
        password: hashedPassword,
      },
    });

    // 일일 기회 초기화
    await prisma.score.create({
      data: {
        userId: user.id,
        totalScore: 0,
        gameCount: 0,
        bestScore: 0,
        averageScore: 0,
        dailyAttempts: 5,
        lastResetAt: new Date(),
      },
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
        },
        "회원가입 성공"
      ),
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "회원가입 중 오류가 발생했습니다"),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
