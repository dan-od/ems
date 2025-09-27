CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add sample data only if there are users in the users table
DO $$
DECLARE
    first_user_id INTEGER;
BEGIN
    -- Get the first user's ID
    SELECT id INTO first_user_id FROM users LIMIT 1;
    
    -- Only insert sample data if we found a user
    IF first_user_id IS NOT NULL THEN
        INSERT INTO reports (type, description, status, user_id)
        VALUES 
            ('equipment', 'New equipment added: Server XYZ', 'completed', first_user_id),
            ('maintenance', 'Scheduled maintenance for Router ABC', 'pending', first_user_id),
            ('user', 'User role updated', 'completed', first_user_id);
    END IF;
END $$;