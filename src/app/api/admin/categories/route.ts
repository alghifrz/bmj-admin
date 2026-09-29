import { proxyAdminRead, proxyAdminWrite } from "@/lib/admin-proxy";

export async function GET() {
  return proxyAdminRead("/api/v1/admin/categories");
}

export async function POST(request: Request) {
  return proxyAdminWrite(request, "/api/v1/admin/categories");
}
