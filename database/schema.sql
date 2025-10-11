
-- Agriculture Marketplace Database Schema

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15),
    user_type VARCHAR(20) CHECK (user_type IN ('farmer', 'buyer', 'admin')) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    registration_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crop_batches (
    batch_id SERIAL PRIMARY KEY,
    farmer_id INTEGER NOT NULL REFERENCES users(user_id),
    crop_type VARCHAR(50) NOT NULL,
    variety VARCHAR(50),
    quantity_kg DECIMAL(10,2) NOT NULL CHECK (quantity_kg > 0),
    desired_price_per_kg DECIMAL(8,2) CHECK (desired_price_per_kg > 0),
    current_status VARCHAR(20) CHECK (current_status IN ('draft', 'submitted', 'grading', 'graded', 'listed', 'sold', 'rejected')),
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crop_images (
    image_id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES crop_batches(batch_id),
    image_url VARCHAR(500) NOT NULL,
    image_type VARCHAR(20),
    upload_order INTEGER DEFAULT 1,
    is_verified BOOLEAN DEFAULT FALSE,
    ai_analysis_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quality_measurements (
    measurement_id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES crop_batches(batch_id),
    defect_percentage DECIMAL(5,2),
    color_uniformity_score DECIMAL(5,2),
    size_variance DECIMAL(5,2),
    shape_consistency DECIMAL(5,2),
    moisture_content DECIMAL(5,2),
    test_weight DECIMAL(6,2),
    foreign_matter_percentage DECIMAL(5,2),
    broken_grain_percentage DECIMAL(5,2),
    final_grade VARCHAR(10) CHECK (final_grade IN ('A', 'B', 'C', 'D', 'Rejected')),
    grading_score DECIMAL(5,2),
    grading_notes TEXT,
    measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP
);

CREATE TABLE grading_rules (
    rule_id SERIAL PRIMARY KEY,
    crop_type VARCHAR(50) NOT NULL,
    grade_level VARCHAR(10) CHECK (grade_level IN ('A', 'B', 'C', 'D', 'Rejected')) NOT NULL,
    max_defect_percentage DECIMAL(5,2),
    min_color_uniformity DECIMAL(5,2),
    max_moisture_content DECIMAL(5,2),
    min_test_weight DECIMAL(6,2),
    max_foreign_matter DECIMAL(5,2),
    max_broken_grain DECIMAL(5,2),
    effective_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market_listings (
    listing_id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES crop_batches(batch_id),
    listing_price_per_kg DECIMAL(8,2) NOT NULL CHECK (listing_price_per_kg > 0),
    quantity_available_kg DECIMAL(10,2) NOT NULL CHECK (quantity_available_kg > 0),
    is_available BOOLEAN DEFAULT TRUE,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES market_listings(listing_id),
    buyer_id INTEGER NOT NULL REFERENCES users(user_id),
    quantity_purchased_kg DECIMAL(8,2) NOT NULL CHECK (quantity_purchased_kg > 0),
    price_per_kg DECIMAL(8,2) NOT NULL CHECK (price_per_kg > 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    transaction_status VARCHAR(20) CHECK (transaction_status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('upi', 'card', 'net_banking', 'wallet')),
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    shipping_address TEXT
);

CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id),
    admin_level VARCHAR(20) CHECK (admin_level IN ('super_admin', 'moderator', 'support')),
    permissions JSONB,
    department VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_actions (
    action_id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(admin_id),
    action_type VARCHAR(50) CHECK (action_type IN ('create_rule', 'modify_rule', 'verify_user', 'ban_user', 'resolve_dispute', 'fraud_review')),
    target_user_id INTEGER REFERENCES users(user_id),
    target_batch_id INTEGER REFERENCES crop_batches(batch_id),
    target_listing_id INTEGER REFERENCES market_listings(listing_id),
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disputes (
    dispute_id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(transaction_id),
    reported_by INTEGER NOT NULL REFERENCES users(user_id),
    reported_against INTEGER NOT NULL REFERENCES users(user_id),
    reason TEXT NOT NULL,
    evidence JSONB,
    status VARCHAR(20) CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
    assigned_admin INTEGER REFERENCES admins(admin_id),
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);
