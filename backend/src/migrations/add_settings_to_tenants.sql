-- Add settings column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "menu": {
    "dashboard": true,
    "schedule": true,
    "classes": true,
    "attendance": true,
    "students": true,
    "teachers": true,
    "rooms": true,
    "branches": true,
    "import": true,
    "subscription": true
  }
}'::jsonb;
