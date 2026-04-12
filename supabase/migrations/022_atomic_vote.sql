-- Migration 022: Atomic vote function for projects
-- Prevents race conditions when multiple users vote simultaneously

CREATE OR REPLACE FUNCTION submit_project_vote(
  p_project_id UUID,
  p_vote TEXT,
  p_author_id UUID,
  p_threshold INTEGER
)
RETURNS TEXT AS $$
DECLARE
  agree_count INTEGER;
  current_status TEXT;
  result_status TEXT;
BEGIN
  -- Get current project status
  SELECT status INTO current_status FROM cockpit_projects WHERE id = p_project_id;
  IF current_status IS NULL THEN RETURN 'error:project_not_found'; END IF;
  IF current_status != 'proposed' THEN RETURN 'error:not_proposed'; END IF;

  -- Delete previous vote from this user (atomic)
  DELETE FROM cockpit_comments
  WHERE entity_type = 'project'
    AND entity_id = p_project_id
    AND author_id = p_author_id
    AND vote IS NOT NULL;

  -- Insert new vote
  INSERT INTO cockpit_comments (entity_type, entity_id, body, vote, author_id)
  VALUES ('project', p_project_id,
    CASE p_vote WHEN 'agree' THEN 'D''accord' WHEN 'disagree' THEN 'Pas d''accord' ELSE 'Neutre' END,
    p_vote, p_author_id);

  -- Count unique agree votes
  SELECT COUNT(DISTINCT author_id) INTO agree_count
  FROM cockpit_comments
  WHERE entity_type = 'project'
    AND entity_id = p_project_id
    AND vote = 'agree';

  -- Auto-approve if threshold reached
  IF agree_count >= p_threshold THEN
    UPDATE cockpit_projects SET status = 'approved', updated_at = NOW() WHERE id = p_project_id;
    result_status := 'approved';
  ELSE
    result_status := 'voted';
  END IF;

  RETURN result_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
