-- Members table
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO members (username, password_hash, is_admin) VALUES ('admin', '$2b$10$nK37j/xgKJhBxzeWDuZeg.5Y2FABcpRJ.tvzr4sZdT08F7.tYSQS2', TRUE);
-- Ballots table
CREATE TABLE ballots (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    quorum INTEGER DEFAULT 0,
    acceptance_threshold INTEGER DEFAULT 50,
    created_by INTEGER REFERENCES members(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ballot Measures table
CREATE TABLE ballot_measures (
    id SERIAL PRIMARY KEY,
    ballot_id INTEGER REFERENCES ballots(id) ON DELETE CASCADE,
    measure_text TEXT NOT NULL,
    measure_description TEXT
);

-- Votes table
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    ballot_id INTEGER REFERENCES ballots(id) ON DELETE CASCADE,
    measure_id INTEGER REFERENCES ballot_measures(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    vote_value VARCHAR(50) NOT NULL,
    vote_count INTEGER DEFAULT 1,
    vote_type VARCHAR(16) DEFAULT 'electronic',
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_vote UNIQUE (ballot_id, measure_id, vote_value, vote_type, member_id)
);

-- Ballot Reports table
CREATE TABLE ballot_reports (
    id SERIAL PRIMARY KEY,
    ballot_id INTEGER REFERENCES ballots(id) ON DELETE CASCADE,
    report_data JSONB,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branding (
    id SERIAL PRIMARY KEY,
    bg_color VARCHAR(32),
    nav_color VARCHAR(32),
    nav_text_color VARCHAR(32),
    text_color VARCHAR(32),
    button_color VARCHAR(32),
    fqdn VARCHAR(255),
    logo_path VARCHAR(255),
    icon_path VARCHAR(255)
);

INSERT INTO branding (bg_color, nav_color, nav_text_color, text_color, button_color, fqdn) VALUES ('#545454', '#b3adad', '#ffffff', '#ffffff', '#1e4166', 'localhost');