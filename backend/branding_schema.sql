-- Branding table for site settings

CREATE TABLE branding (
    id SERIAL PRIMARY KEY,
    bg_color VARCHAR(32),
    nav_color VARCHAR(32),
    text_color VARCHAR(32),
    fqdn VARCHAR(255),
    logo_path VARCHAR(255),
    icon_path VARCHAR(255)
);

INSERT INTO branding (bg_color, nav_color, text_color, fqdn) VALUES ('#ffffff', '#333333', '#000000', 'localhost');