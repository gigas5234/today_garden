import { NextRequest, NextResponse } from "next/server";
import { recordPhoto, signedUploadUrl, REPO_USES_SUPABASE } from "@/lib/store/repo";

/**
 * 사진 업로드 흐름:
 *   1. 클라가 POST { crop_id, filename } → 서버가 presigned URL 반환 (Supabase 모드)
 *   2. 클라가 PUT 으로 그 URL 에 파일 업로드
 *   3. 클라가 POST /api/photos { crop_id, storage_path, memo } → 메타 저장
 *
 * Supabase off 일 땐 Storage 가 없어 이 라우트는 503 을 돌려준다.
 */
export async function POST(req: NextRequest) {
  if (!REPO_USES_SUPABASE) {
    return NextResponse.json(
      { error: "Supabase storage not configured. .env.local 의 SUPABASE_* 채워주세요." },
      { status: 503 }
    );
  }
  const { crop_id, filename } = await req.json();
  if (!crop_id || !filename) {
    return NextResponse.json({ error: "crop_id, filename required" }, { status: 400 });
  }
  const out = await signedUploadUrl(crop_id, filename);
  if (!out) return NextResponse.json({ error: "no signed url" }, { status: 500 });
  return NextResponse.json(out);
}
