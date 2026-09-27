-- Fix security issues: Enable RLS on existing documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create basic policies for documents table (seems to be for document storage/search)
-- These policies make the table publicly readable but require authentication for write operations
CREATE POLICY "Allow public read access" 
ON public.documents 
FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated users to insert" 
ON public.documents 
FOR INSERT 
TO authenticated
WITH CHECK (true);