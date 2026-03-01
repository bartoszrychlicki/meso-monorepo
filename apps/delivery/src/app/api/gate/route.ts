import { NextRequest, NextResponse } from 'next/server'

const ACCESS_PASSWORD = 'TuJestMeso2026'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (password === ACCESS_PASSWORD) {
    const response = NextResponse.json({ ok: true })
    response.cookies.set('meso_access', ACCESS_PASSWORD, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return response
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
}
