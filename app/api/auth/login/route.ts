import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import * as cookie from 'cookie';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    const expectedToken = process.env.APP_ACCESS_TOKEN;

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default_secret_for_dev');
    const jwt = await new SignJWT({ authenticated: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    const serializedCookie = cookie.serialize('auth_token', jwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    const res = NextResponse.json({ success: true });
    res.headers.set('Set-Cookie', serializedCookie);
    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
