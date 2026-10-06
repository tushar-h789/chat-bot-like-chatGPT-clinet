import { getApiClient } from "@/lib/api/client";
import type { AttachedFile } from "@/lib/api/types";

export async function uploadFile(file: File): Promise<AttachedFile> {
  const body = new FormData();
  body.append("file", file);
  const response = await getApiClient().post<AttachedFile>("/api/v1/files", body);
  return response.data;
}

export async function deleteFile(fileId: string): Promise<void> {
  await getApiClient().delete(`/api/v1/files/${fileId}`);
}
