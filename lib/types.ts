export interface UploadedFile {
  name: string
  size: number
  path: string
  type: string // mime type
  uploadedAt: Date
  publicUrl?: string
}
