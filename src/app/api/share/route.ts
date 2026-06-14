export function GET() {
  return Response.json(
    { error: 'Server-side sharing is not available. Use the Share button in the editor to get a self-contained link.' },
    { status: 410 },
  );
}

export function POST() {
  return Response.json(
    { error: 'Server-side sharing is not available. Use the Share button in the editor to get a self-contained link.' },
    { status: 410 },
  );
}
