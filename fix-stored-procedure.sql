-- Fixed Supabase Stored Procedure: create_team_with_captain
-- Handles npub field properly to avoid NOT NULL constraint violations

CREATE OR REPLACE FUNCTION create_team_with_captain(
    p_team_name TEXT,
    p_team_about TEXT,
    p_captain_id UUID,
    p_captain_name TEXT,
    p_difficulty TEXT DEFAULT 'intermediate',
    p_prize_pool INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_team_id UUID;
    v_result JSON;
BEGIN
    -- Step 1: Ensure captain user exists (UPSERT)
    -- FIXED: Include npub field with placeholder value to satisfy NOT NULL constraint
    INSERT INTO users (id, name, npub, role, created_at, updated_at)
    VALUES (p_captain_id, p_captain_name, 'placeholder_' || p_captain_id::TEXT, 'captain', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        updated_at = NOW();

    -- Step 2: Create team
    INSERT INTO teams (
        name, 
        about, 
        captain_id, 
        difficulty_level, 
        prize_pool, 
        is_active, 
        is_featured, 
        member_count
    )
    VALUES (
        p_team_name, 
        p_team_about, 
        p_captain_id, 
        p_difficulty::difficulty_level, 
        p_prize_pool, 
        true, 
        false, 
        1
    )
    RETURNING id INTO v_team_id;

    -- Step 3: Add captain as team member
    INSERT INTO team_members (
        user_id, 
        team_id, 
        role, 
        joined_at, 
        is_active, 
        total_workouts, 
        total_distance_meters
    )
    VALUES (
        p_captain_id, 
        v_team_id, 
        'captain', 
        NOW(), 
        true, 
        0, 
        0
    );

    -- Step 4: Update user's current team
    UPDATE users 
    SET current_team_id = v_team_id, updated_at = NOW()
    WHERE id = p_captain_id;

    -- Return success result
    v_result := json_build_object(
        'success', true,
        'team_id', v_team_id,
        'message', 'Team created successfully'
    );
    
    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- Return error result
    v_result := json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Team creation failed'
    );
    
    RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_team_with_captain(TEXT, TEXT, UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_team_with_captain(TEXT, TEXT, UUID, TEXT, TEXT, INTEGER) TO anon;