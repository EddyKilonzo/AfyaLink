-- SYNTHETIC DEVELOPMENT DATA ONLY. No real people, places of residence or patients.
-- All accounts share the development password: AfyaLink#Dev2026
-- Re-runnable: uses INSERT IGNORE on stable keys.

INSERT IGNORE INTO locations (id, county, sub_county, ward, village, latitude, longitude) VALUES
  (1, 'Kitui', 'Kitui Central', 'Miambani',  'Kavuta (demo)',   -1.367000, 38.010000),
  (2, 'Kitui', 'Mwingi Central', 'Mwingi Central', 'Kyamboo (demo)', -0.934000, 38.060000),
  (3, 'Turkana', 'Turkana Central', 'Kanamkemer', 'Nakwamekwi (demo)', 3.119000, 35.597000),
  (4, 'Kilifi', 'Malindi', 'Ganda', 'Mkaumoto (demo)', -3.198000, 40.080000),
  (5, 'Kakamega', 'Lurambi', 'Butsotso East', 'Ingotse (demo)', 0.360000, 34.780000);

INSERT IGNORE INTO users (id, full_name, email, phone, password_hash, role, location_id) VALUES
  ('a9030f8c-37d1-4848-88b2-9f6d08e60b2a', 'Demo Admin', 'admin@afyalink.test', NULL,
   '$2b$12$.IAfMF1NDci0S9kK2ChGF.n8bKRSobq8EJykFhQDad7vYY3m9sPaO', 'ADMIN', NULL),
  ('a8a968ed-0808-48df-a2ab-a8b461ad41de', 'Demo CHV Mwende', 'chv.mwende@afyalink.test', '+254700000001',
   '$2b$12$.IAfMF1NDci0S9kK2ChGF.n8bKRSobq8EJykFhQDad7vYY3m9sPaO', 'CHV', 1),
  ('a04a8d2f-bc61-4b10-b0d0-8d97891eb97b', 'Demo CHV Ekai', 'chv.ekai@afyalink.test', '+254700000002',
   '$2b$12$.IAfMF1NDci0S9kK2ChGF.n8bKRSobq8EJykFhQDad7vYY3m9sPaO', 'CHV', 3);

INSERT IGNORE INTO health_reports
  (id, chv_id, location_id, category, condition_name, severity, cases_count, age_group,
   symptoms, notes, latitude, longitude, observed_at, client_created_at, status)
VALUES
  ('3c7fe5e3-7395-46ea-9f20-ee1fe9c5b6a4', 'a8a968ed-0808-48df-a2ab-a8b461ad41de', 1, 'DISEASE_CASE', 'Malaria', 'MODERATE', 4, 'UNDER_5',
   JSON_ARRAY('fever','chills'), 'Synthetic demo report.', -1.367500, 38.011200,
   UTC_TIMESTAMP() - INTERVAL 2 DAY, UTC_TIMESTAMP() - INTERVAL 2 DAY, 'SUBMITTED'),
  ('571477a5-18fa-4ea2-afa9-f86a7478b573', 'a8a968ed-0808-48df-a2ab-a8b461ad41de', 1, 'WATER_SANITATION', 'Contaminated borehole', 'HIGH', 1, 'MIXED',
   NULL, 'Synthetic demo report.', -1.366100, 38.009400,
   UTC_TIMESTAMP() - INTERVAL 5 DAY, UTC_TIMESTAMP() - INTERVAL 5 DAY, 'REVIEWED'),
  ('7ab73098-e76a-4ff8-b641-7c7312239ecc', 'a8a968ed-0808-48df-a2ab-a8b461ad41de', 2, 'DISEASE_CASE', 'Acute watery diarrhoea', 'HIGH', 6, 'MIXED',
   JSON_ARRAY('diarrhoea','vomiting','dehydration'), 'Synthetic demo report.', -0.934800, 38.061100,
   UTC_TIMESTAMP() - INTERVAL 1 DAY, UTC_TIMESTAMP() - INTERVAL 1 DAY, 'SUBMITTED'),
  ('29ce23a7-038f-4ccb-9d95-35c329d77451', 'a8a968ed-0808-48df-a2ab-a8b461ad41de', 1, 'MATERNAL_HEALTH', 'Missed antenatal visit', 'LOW', 2, 'AGE_18_59',
   NULL, 'Synthetic demo report.', NULL, NULL,
   UTC_TIMESTAMP() - INTERVAL 9 DAY, UTC_TIMESTAMP() - INTERVAL 9 DAY, 'ACTIONED'),
  ('432498d9-c983-4e4c-bed4-f548f1e49273', 'a04a8d2f-bc61-4b10-b0d0-8d97891eb97b', 3, 'NUTRITION', 'Moderate acute malnutrition', 'HIGH', 3, 'UNDER_5',
   JSON_ARRAY('wasting'), 'Synthetic demo report.', 3.119800, 35.598100,
   UTC_TIMESTAMP() - INTERVAL 3 DAY, UTC_TIMESTAMP() - INTERVAL 3 DAY, 'SUBMITTED'),
  ('25329661-a94d-4135-bec8-4d49e5555bf6', 'a04a8d2f-bc61-4b10-b0d0-8d97891eb97b', 3, 'DISEASE_CASE', 'Measles (suspected)', 'CRITICAL', 2, 'AGE_5_17',
   JSON_ARRAY('rash','fever','cough'), 'Synthetic demo report.', 3.120400, 35.596500,
   UTC_TIMESTAMP() - INTERVAL 4 DAY, UTC_TIMESTAMP() - INTERVAL 4 DAY, 'REVIEWED'),
  ('11f6c17a-093d-4adf-80b6-8badd509ade2', 'a04a8d2f-bc61-4b10-b0d0-8d97891eb97b', 3, 'DISEASE_CASE', 'Malaria', 'LOW', 1, 'AGE_18_59',
   JSON_ARRAY('fever'), 'Synthetic demo report.', 3.118900, 35.597800,
   UTC_TIMESTAMP() - INTERVAL 12 DAY, UTC_TIMESTAMP() - INTERVAL 12 DAY, 'ACTIONED'),
  ('baae53a4-0720-4d60-b20c-1993633145f7', 'a8a968ed-0808-48df-a2ab-a8b461ad41de', 1, 'CHILD_HEALTH', 'Missed immunisation', 'MODERATE', 3, 'UNDER_5',
   NULL, 'Synthetic demo report.', -1.368200, 38.012000,
   UTC_TIMESTAMP() - INTERVAL 7 DAY, UTC_TIMESTAMP() - INTERVAL 7 DAY, 'SUBMITTED');
