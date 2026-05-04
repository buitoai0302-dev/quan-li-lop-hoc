-- Migration to add status column if it's missing in tenants table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='status') THEN
        ALTER TABLE tenants ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'active';
    END IF;
END $$;
