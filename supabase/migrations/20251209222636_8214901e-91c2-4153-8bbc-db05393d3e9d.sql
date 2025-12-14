-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-uploads', 'media-uploads', true);

-- Allow anyone to read files (public bucket)
CREATE POLICY "Public read access for media uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-uploads');

-- Allow anyone to upload files (since no auth)
CREATE POLICY "Public upload access for media uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media-uploads');

-- Allow anyone to delete files
CREATE POLICY "Public delete access for media uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'media-uploads');