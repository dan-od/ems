-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER REFERENCES equipment(id),
    requested_by INTEGER REFERENCES users(id),
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    is_new_equipment BOOLEAN DEFAULT FALSE,
    new_equipment_name VARCHAR(255),
    new_equipment_description TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_requests_equipment ON requests(equipment_id);
CREATE INDEX IF NOT EXISTS idx_requests_requested_by ON requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status); 