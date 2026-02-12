-- Add contract fields to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS contract_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS contract_value DECIMAL(10, 2);

-- Create client_meetings table
CREATE TABLE IF NOT EXISTS client_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  link TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_notes table
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_complaints table
CREATE TABLE IF NOT EXISTS client_complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, resolved
  severity TEXT DEFAULT 'medium', -- low, medium, high
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies (assuming RLS is enabled, copying patterns from other tables if known, otherwise basic authenticated access)
ALTER TABLE client_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON client_meetings 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON client_meetings 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON client_meetings 
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON client_meetings 
FOR DELETE USING (auth.role() = 'authenticated');

-- Repeat for notes
CREATE POLICY "Enable read access for authenticated users" ON client_notes
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON client_notes
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON client_notes
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON client_notes
FOR DELETE USING (auth.role() = 'authenticated');

-- Repeat for complaints
CREATE POLICY "Enable read access for authenticated users" ON client_complaints
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON client_complaints
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON client_complaints
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON client_complaints
FOR DELETE USING (auth.role() = 'authenticated');
