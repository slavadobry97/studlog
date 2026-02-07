-- Add absence_request_id column to attendance table to link with absence requests
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS absence_request_id INTEGER REFERENCES public.absence_requests(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_absence_request_id 
ON public.attendance(absence_request_id);

-- Add comment to explain the column
COMMENT ON COLUMN public.attendance.absence_request_id IS 'Links attendance record to an absence request if the absence was justified by a student request';
