-- Existing demo contact values must not be presented as real business details.
UPDATE system_settings SET setting_value = '', updated_at = NOW()
WHERE (setting_key = 'CONTACT_EMAIL' AND setting_value = 'contact@eduschedule.com')
   OR (setting_key = 'CONTACT_PHONE' AND setting_value = '0901234567')
   OR (setting_key = 'CONTACT_ZALO' AND setting_value = 'https://zalo.me/0901234567')
   OR (setting_key = 'CONTACT_ADDRESS' AND setting_value = '123 Đường ABC, Quận XYZ, TP.HCM')
   OR (setting_key = 'TAX_CODE' AND setting_value = '0123456789')
   OR (setting_key = 'POSTAL_CODE' AND setting_value = '700000');

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('LEGAL_ENTITY_NAME', '', 'Legal operator name'),
  ('LEGAL_EFFECTIVE_DATE', '', 'Policy effective date, YYYY-MM-DD'),
  ('LEGAL_PUBLISHED', 'false', 'Publish approved legal documents'),
  ('PRIVACY_POLICY_VI', '', 'Vietnamese privacy policy'),
  ('PRIVACY_POLICY_EN', '', 'English privacy policy'),
  ('TERMS_OF_SERVICE_VI', '', 'Vietnamese terms of service'),
  ('TERMS_OF_SERVICE_EN', '', 'English terms of service')
ON CONFLICT (setting_key) DO NOTHING;
