import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import * as cookie from 'cookie';

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) {
    return NextResponse.json({ authenticated: false });
  }

  const cookies = cookie.parse(cookieHeader);
  const token = cookies.auth_token;

  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default_secret_for_dev');
    await jwtVerify(token, secret);
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    return NextResponse.json({ authenticated: false });
  }
}
