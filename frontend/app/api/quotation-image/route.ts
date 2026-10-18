import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function isAllowedImageUrl(url: URL): boolean {
  const trustedR2Host =
    url.hostname.endsWith('.r2.dev') || url.hostname.endsWith('.r2.cloudflarestorage.com');
  const imageObject = /(?:^|\/)(?:products|spare-parts)\//.test(url.pathname);
  return url.protocol === 'https:' && trustedR2Host && imageObject;
}

/** Same-origin image relay so quotation PDFs can embed R2 photos without browser CORS. */
export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('source');
  if (!source) return NextResponse.json({ error: 'Image source is required' }, { status: 400 });

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return NextResponse.json({ error: 'Invalid image source' }, { status: 400 });
  }
  if (!isAllowedImageUrl(sourceUrl)) {
    return NextResponse.json({ error: 'Image host or path is not allowed' }, { status: 400 });
  }

  try {
    const upstream = await fetch(sourceUrl, { redirect: 'error', cache: 'no-store' });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Could not retrieve quotation image' }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Quotation image URL did not return an image' },
        { status: 502 },
      );
    }
    const declaredLength = Number(upstream.headers.get('content-length') || 0);
    if (declaredLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Quotation image is too large' }, { status: 413 });
    }

    const image = await upstream.arrayBuffer();
    if (image.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Quotation image is too large' }, { status: 413 });
    }
    return new NextResponse(image, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(image.byteLength),
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Could not retrieve quotation image' }, { status: 502 });
  }
}
