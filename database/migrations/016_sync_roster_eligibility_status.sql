-- ============================================================================
-- Migration 016: Synchronize Student Roster Eligibility and Account Membership
-- Harmonize is_active and enrollment_status across student_rosters and organization_members
-- ============================================================================

-- 1. For active roster records that were left with enrollment_status = 'inactive' due to desynchronized status toggling, restore enrollment_status to 'active'
UPDATE student_rosters
SET enrollment_status = 'active', updated_at = NOW()
WHERE is_active = TRUE AND enrollment_status = 'inactive';

-- 2. For deactivated roster records with is_active = FALSE and enrollment_status = 'active', synchronize enrollment_status to 'inactive'
UPDATE student_rosters
SET enrollment_status = 'inactive', updated_at = NOW()
WHERE is_active = FALSE AND enrollment_status = 'active';

-- 3. Match any unlinked student_rosters with existing users by email
UPDATE student_rosters sr
SET matched_user_id = u.id, updated_at = NOW()
FROM users u
WHERE LOWER(sr.college_email) = LOWER(u.email)
  AND sr.matched_user_id IS NULL;

-- 4. Synchronize organization_members enrollment_status with student_rosters for matched users
UPDATE organization_members om
SET enrollment_status = sr.enrollment_status,
    department = COALESCE(sr.department, om.department),
    academic_year = COALESCE(sr.academic_year, om.academic_year),
    student_id_number = COALESCE(sr.student_id_number, om.student_id_number),
    updated_at = NOW()
FROM student_rosters sr
WHERE om.organization_id = sr.organization_id
  AND om.user_id = sr.matched_user_id
  AND sr.matched_user_id IS NOT NULL
  AND om.enrollment_status != sr.enrollment_status;

-- 5. Ensure all matched roster students have an organization_members entry
INSERT INTO organization_members (organization_id, user_id, role, department, academic_year, enrollment_status, student_id_number)
SELECT sr.organization_id, sr.matched_user_id, 'student', sr.department, sr.academic_year, sr.enrollment_status, sr.student_id_number
FROM student_rosters sr
WHERE sr.matched_user_id IS NOT NULL
ON CONFLICT (organization_id, user_id)
DO UPDATE SET
  department = COALESCE(EXCLUDED.department, organization_members.department),
  academic_year = COALESCE(EXCLUDED.academic_year, organization_members.academic_year),
  enrollment_status = EXCLUDED.enrollment_status,
  student_id_number = COALESCE(EXCLUDED.student_id_number, organization_members.student_id_number),
  updated_at = NOW();
