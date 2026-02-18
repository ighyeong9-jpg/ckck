export interface GalleryPhoto {
  id: string
  url: string
  file_name: string
  category: string
  description: string | null
  uploaded_at: string
}

export interface DateGroup {
  date: string
  photos: GalleryPhoto[]
}
