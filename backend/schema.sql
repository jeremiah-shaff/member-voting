-- Members table
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    measure_text TEXT NOT NULL
);

-- Votes table
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    ballot_id INTEGER REFERENCES ballots(id) ON DELETE CASCADE,
    measure_id INTEGER REFERENCES ballot_measures(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    vote_value VARCHAR(50) NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ballot Reports table
CREATE TABLE ballot_reports (
    id SERIAL PRIMARY KEY,
    ballot_id INTEGER REFERENCES ballots(id) ON DELETE CASCADE,
    report_data JSONB,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
