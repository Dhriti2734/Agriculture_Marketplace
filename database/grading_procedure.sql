CREATE OR REPLACE FUNCTION grade_crop_batch(p_batch_id INTEGER)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
    v_crop_type VARCHAR;
    v_defect_pct DECIMAL;
    v_color_score DECIMAL;
    v_moisture DECIMAL;
    v_test_weight DECIMAL;
    v_final_grade VARCHAR;
    v_rule RECORD;
BEGIN
    -- Get the crop measurements
    SELECT cb.crop_type, qm.defect_percentage, qm.color_uniformity_score,
           qm.moisture_content, qm.test_weight
    INTO v_crop_type, v_defect_pct, v_color_score, v_moisture, v_test_weight
    FROM crop_batches cb
    JOIN quality_measurements qm ON cb.batch_id = qm.batch_id
    WHERE cb.batch_id = p_batch_id;

    -- Check if we found the batch
    IF v_crop_type IS NULL THEN
        RETURN 'Error: Batch not found';
    END IF;

    -- Get the grading rules for this crop type
    SELECT * INTO v_rule
    FROM grading_rules 
    WHERE crop_type = v_crop_type 
      AND is_active = true
    ORDER BY 
        CASE grade_level 
            WHEN 'A' THEN 1
            WHEN 'B' THEN 2 
            WHEN 'C' THEN 3
            ELSE 4
        END
    LIMIT 1;

    -- If no rules found
    IF NOT FOUND THEN
        RETURN 'Error: No grading rules found for ' || v_crop_type;
    END IF;

    -- Apply grading logic
    IF v_defect_pct <= v_rule.max_defect_percentage AND
       v_color_score >= v_rule.min_color_uniformity AND
       v_moisture <= v_rule.max_moisture_content AND
       v_test_weight >= v_rule.min_test_weight THEN
        
        v_final_grade := v_rule.grade_level;
    ELSE
        v_final_grade := 'Rejected';
    END IF;

    -- Update the tables with final grade
    UPDATE quality_measurements 
    SET final_grade = v_final_grade,
        graded_at = CURRENT_TIMESTAMP
    WHERE batch_id = p_batch_id;

    UPDATE crop_batches 
    SET grade_assigned = v_final_grade,
        current_status = 'graded',
        updated_at = CURRENT_TIMESTAMP
    WHERE batch_id = p_batch_id;

    RETURN v_final_grade;
END;
$$;