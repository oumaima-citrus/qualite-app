import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://kpxsnxgkyxjbgklpwqyr.supabase.co"
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtweHNueGdreXhqYmdrbHB3cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzU1ODAsImV4cCI6MjA5MzgxMTU4MH0.KsYmjctN08EPw3ILtLZwWcT0zQ3lowmuXzeXx9VR424'

export const supabase = createClient(supabaseUrl, supabaseKey)