-- ================================================================
-- INSIGHT AI - COMPLETE DATABASE SCHEMA
-- Version: 1.0 Final
-- Author: Insight AI Team
-- Description: Production-ready schema for automated analytics
-- Date: 2024
-- ================================================================

-- ================================================================
-- PREREQUISITES
-- ================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- ================================================================
-- CLEAN SLATE: DROP ALL EXISTING TABLES
-- ================================================================

-- Drop in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS user_activity CASCADE;
DROP TABLE IF EXISTS exports CASCADE;
DROP TABLE IF EXISTS query_history CASCADE;
DROP TABLE IF EXISTS dashboard_shares CASCADE;
DROP TABLE IF EXISTS chart_configurations CASCADE;
DROP TABLE IF EXISTS insights CASCADE;
DROP TABLE IF EXISTS ml_results CASCADE;
DROP TABLE IF EXISTS dataset_storage CASCADE;
DROP TABLE IF EXISTS dashboards CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS themes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop views
DROP VIEW IF EXISTS dashboard_summary CASCADE;
DROP VIEW IF EXISTS best_models CASCADE;
DROP VIEW IF EXISTS user_dashboard_stats CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS log_user_activity() CASCADE;

-- ================================================================
-- TABLE 1: USERS (Authentication & User Management)
-- ================================================================

CREATE TABLE users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile Information
    name VARCHAR(255) NOT NULL,
    profile_picture_url VARCHAR(500),
    
    -- Authorization & Status
    role VARCHAR(50) DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_login TIMESTAMP,
    
    -- Constraints
    CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'analyst')),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE users IS 'User accounts and authentication information';
COMMENT ON COLUMN users.role IS 'User role: user (standard), admin (full access), analyst (advanced features)';
COMMENT ON COLUMN users.is_active IS 'Account active status - false if deactivated';
COMMENT ON COLUMN users.email_verified IS 'Email verification status from registration';

-- ================================================================
-- TABLE 2: SESSIONS (JWT Token Management)
-- ================================================================

CREATE TABLE sessions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session Data
    token VARCHAR(500) UNIQUE NOT NULL,
    login_time TIMESTAMP DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    
    -- Device Information
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info JSONB,
    
    -- Constraints
    CONSTRAINT sessions_expires_check CHECK (expires_at > login_time)
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_active ON sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Comments
COMMENT ON TABLE sessions IS 'User login sessions and JWT token tracking';
COMMENT ON COLUMN sessions.token IS 'JWT access token string';
COMMENT ON COLUMN sessions.device_info IS 'JSON containing browser and device details';

-- ================================================================
-- TABLE 3: USER_PREFERENCES (User Settings)
-- ================================================================

CREATE TABLE user_preferences (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key (One-to-One with users)
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Preferences
    default_theme VARCHAR(50) DEFAULT 'light' NOT NULL,
    preferences JSONB,
    notifications_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Timestamp
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Comments
COMMENT ON TABLE user_preferences IS 'User-specific settings and preferences';
COMMENT ON COLUMN user_preferences.preferences IS 'Additional user preferences in JSON format';

-- ================================================================
-- TABLE 4: THEMES (Dashboard Styling)
-- ================================================================

CREATE TABLE themes (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Theme Identity
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Theme Configuration
    colors JSONB NOT NULL,
    fonts JSONB,
    chart_styles JSONB,
    
    -- Status
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Preview
    preview_image_url VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_themes_name ON themes(name);
CREATE INDEX idx_themes_default ON themes(is_default) WHERE is_default = TRUE;
CREATE UNIQUE INDEX idx_themes_single_default ON themes(is_default) WHERE is_default = TRUE;

-- Comments
COMMENT ON TABLE themes IS 'Dashboard theme configurations for styling';
COMMENT ON COLUMN themes.colors IS 'JSON object: {primary, secondary, background, text, accent, cardBg, border}';
COMMENT ON COLUMN themes.fonts IS 'JSON object: {heading, body, sizes}';
COMMENT ON COLUMN themes.chart_styles IS 'JSON object: Default chart color schemes';

-- ================================================================
-- TABLE 5: DASHBOARDS (Main Entity)
-- ================================================================

CREATE TABLE dashboards (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme_id UUID REFERENCES themes(id) ON DELETE SET NULL,
    
    -- Dashboard Metadata
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Dataset Information
    dataset_filename VARCHAR(255) NOT NULL,
    dataset_url VARCHAR(500),
    dataset_size_bytes BIGINT,
    row_count INTEGER,
    column_count INTEGER,
    
    -- ML Configuration
    target_column VARCHAR(255),
    problem_type VARCHAR(50),
    
    -- Configuration
    config JSONB,
    layout JSONB,
    
    -- Visibility & Stats
    is_public BOOLEAN DEFAULT FALSE NOT NULL,
    view_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_viewed_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT dashboards_problem_type_check CHECK (
        problem_type IN ('classification', 'regression', 'clustering')
    ),
    CONSTRAINT dashboards_row_count_check CHECK (row_count >= 0),
    CONSTRAINT dashboards_column_count_check CHECK (column_count >= 0),
    CONSTRAINT dashboards_view_count_check CHECK (view_count >= 0)
);

-- Indexes
CREATE INDEX idx_dashboards_user_id ON dashboards(user_id);
CREATE INDEX idx_dashboards_theme_id ON dashboards(theme_id);
CREATE INDEX idx_dashboards_created_at ON dashboards(created_at DESC);
CREATE INDEX idx_dashboards_public ON dashboards(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_dashboards_problem_type ON dashboards(problem_type);
CREATE INDEX idx_dashboards_title_search ON dashboards USING gin(to_tsvector('english', title));

-- Comments
COMMENT ON TABLE dashboards IS 'Main dashboard entity with metadata and configuration';
COMMENT ON COLUMN dashboards.problem_type IS 'ML problem type: classification, regression, or clustering';
COMMENT ON COLUMN dashboards.config IS 'Additional configuration: KPIs, filters, settings (JSON)';
COMMENT ON COLUMN dashboards.layout IS 'Dashboard grid layout configuration (JSON)';

-- ================================================================
-- TABLE 6: DATASET_STORAGE (CSV Data Storage)
-- ================================================================

CREATE TABLE dataset_storage (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key (One-to-One with dashboards)
    dashboard_id UUID NOT NULL UNIQUE REFERENCES dashboards(id) ON DELETE CASCADE,
    
    -- Data Storage
    data JSONB NOT NULL,
    row_count INTEGER,
    column_names TEXT[],
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT dataset_storage_row_count_check CHECK (row_count >= 0)
);

-- Indexes
CREATE UNIQUE INDEX idx_dataset_storage_dashboard ON dataset_storage(dashboard_id);

-- Comments
COMMENT ON TABLE dataset_storage IS 'Stores processed CSV data in JSON format for chart rendering';
COMMENT ON COLUMN dataset_storage.data IS 'CSV data as JSON array (limited to 500 rows for performance)';
COMMENT ON COLUMN dataset_storage.column_names IS 'Array of column names from dataset';

-- ================================================================
-- TABLE 7: ML_RESULTS (Model Training Results)
-- ================================================================

CREATE TABLE ml_results (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    
    -- Model Information
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    
    -- Performance Metrics
    test_score FLOAT NOT NULL,
    cv_score FLOAT,
    training_time FLOAT,
    
    -- Model Details
    feature_importance JSONB,
    confusion_matrix JSONB,
    prediction_samples JSONB,
    hyperparameters JSONB,
    
    -- Status
    is_best_model BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT ml_results_test_score_check CHECK (test_score >= 0 AND test_score <= 1),
    CONSTRAINT ml_results_cv_score_check CHECK (cv_score IS NULL OR (cv_score >= 0 AND cv_score <= 1)),
    CONSTRAINT ml_results_training_time_check CHECK (training_time IS NULL OR training_time >= 0)
);

-- Indexes
CREATE INDEX idx_ml_results_dashboard_id ON ml_results(dashboard_id);
CREATE INDEX idx_ml_results_model_name ON ml_results(model_name);
CREATE INDEX idx_ml_results_best_model ON ml_results(is_best_model) WHERE is_best_model = TRUE;
CREATE INDEX idx_ml_results_test_score ON ml_results(test_score DESC);

-- Comments
COMMENT ON TABLE ml_results IS 'Machine learning model training results and performance metrics';
COMMENT ON COLUMN ml_results.test_score IS 'Model performance on test set (accuracy for classification, R² for regression)';
COMMENT ON COLUMN ml_results.cv_score IS 'Cross-validation score for model reliability';
COMMENT ON COLUMN ml_results.is_best_model IS 'Indicates the best performing model for this dashboard';

-- ================================================================
-- TABLE 8: INSIGHTS (AI-Generated Insights)
-- ================================================================

CREATE TABLE insights (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    
    -- Insight Data
    insight_type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    
    -- Classification
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    category VARCHAR(100),
    icon VARCHAR(50),
    
    -- Additional Data
    metadata_info JSONB,
    confidence_score FLOAT,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT insights_type_check CHECK (
        insight_type IN ('trend', 'comparison', 'anomaly', 'recommendation', 'distribution', 'general')
    ),
    CONSTRAINT insights_priority_check CHECK (priority IN ('low', 'medium', 'high')),
    CONSTRAINT insights_confidence_check CHECK (
        confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)
    )
);

-- Indexes
CREATE INDEX idx_insights_dashboard_id ON insights(dashboard_id);
CREATE INDEX idx_insights_priority ON insights(priority);
CREATE INDEX idx_insights_type ON insights(insight_type);
CREATE INDEX idx_insights_created_at ON insights(created_at DESC);

-- Comments
COMMENT ON TABLE insights IS 'AI-generated insights from Gemini API';
COMMENT ON COLUMN insights.insight_type IS 'Type: trend, comparison, anomaly, recommendation, distribution, general';
COMMENT ON COLUMN insights.confidence_score IS 'AI confidence level (0.0 to 1.0)';

-- ================================================================
-- TABLE 9: CHART_CONFIGURATIONS (Chart Settings)
-- ================================================================

CREATE TABLE chart_configurations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    
    -- Chart Information
    chart_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    
    -- Data Mapping
    x_column VARCHAR(100),
    y_column VARCHAR(100),
    color_column VARCHAR(100),
    aggregation VARCHAR(50),
    
    -- Layout & Style
    position JSONB,
    style JSONB,
    data_filters JSONB,
    
    -- Display
    order_index INTEGER DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT chart_type_check CHECK (
        chart_type IN ('bar', 'line', 'pie', 'scatter', 'heatmap', 'histogram', 'area', 'table')
    ),
    CONSTRAINT chart_aggregation_check CHECK (
        aggregation IS NULL OR aggregation IN ('sum', 'mean', 'count', 'max', 'min', 'median')
    )
);

-- Indexes
CREATE INDEX idx_charts_dashboard_id ON chart_configurations(dashboard_id);
CREATE INDEX idx_charts_order ON chart_configurations(order_index);
CREATE INDEX idx_charts_visible ON chart_configurations(is_visible) WHERE is_visible = TRUE;

-- Comments
COMMENT ON TABLE chart_configurations IS 'Individual chart configurations and positioning';
COMMENT ON COLUMN chart_configurations.position IS 'Grid position: {x, y, width, height} (JSON)';
COMMENT ON COLUMN chart_configurations.style IS 'Chart styling: colors, legends, axes (JSON)';

-- ================================================================
-- TABLE 10: DASHBOARD_SHARES (Sharing & Collaboration)
-- ================================================================

CREATE TABLE dashboard_shares (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Share Information
    share_token VARCHAR(100) UNIQUE NOT NULL,
    shared_with_email VARCHAR(255),
    permission_level VARCHAR(20) NOT NULL DEFAULT 'view',
    
    -- Status
    is_public BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Stats & Timestamps
    view_count INTEGER DEFAULT 0 NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    accessed_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT shares_permission_check CHECK (permission_level IN ('view', 'edit')),
    CONSTRAINT shares_expires_check CHECK (expires_at IS NULL OR expires_at > created_at),
    CONSTRAINT shares_view_count_check CHECK (view_count >= 0)
);

-- Indexes
CREATE INDEX idx_shares_dashboard_id ON dashboard_shares(dashboard_id);
CREATE INDEX idx_shares_token ON dashboard_shares(share_token);
CREATE INDEX idx_shares_email ON dashboard_shares(shared_with_email);
CREATE INDEX idx_shares_expires ON dashboard_shares(expires_at);

-- Comments
COMMENT ON TABLE dashboard_shares IS 'Dashboard sharing and collaboration management';
COMMENT ON COLUMN dashboard_shares.permission_level IS 'Access level: view (read-only) or edit (can modify)';
COMMENT ON COLUMN dashboard_shares.share_token IS 'Unique token for public link sharing';

-- ================================================================
-- TABLE 11: QUERY_HISTORY (Natural Language Queries)
-- ================================================================

CREATE TABLE query_history (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
    
    -- Query Data
    query_text TEXT NOT NULL,
    generated_code TEXT,
    generated_pandas_code TEXT,
    result_data JSONB,
    
    -- Performance & Status
    execution_time FLOAT,
    was_successful BOOLEAN DEFAULT TRUE NOT NULL,
    error_message TEXT,
    
    -- Timestamp
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT query_execution_time_check CHECK (execution_time IS NULL OR execution_time >= 0)
);

-- Indexes
CREATE INDEX idx_query_history_user_id ON query_history(user_id);
CREATE INDEX idx_query_history_dashboard_id ON query_history(dashboard_id);
CREATE INDEX idx_query_history_timestamp ON query_history(timestamp DESC);

-- Comments
COMMENT ON TABLE query_history IS 'Natural language query history and results';
COMMENT ON COLUMN query_history.generated_code IS 'SQL code generated from natural language query';
COMMENT ON COLUMN query_history.generated_pandas_code IS 'Pandas code generated from natural language query';

-- ================================================================
-- TABLE 12: EXPORTS (Export History)
-- ================================================================

CREATE TABLE exports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Export Information
    export_type VARCHAR(20) NOT NULL,
    file_url VARCHAR(500),
    file_size_bytes BIGINT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    error_message TEXT,
    
    -- Stats & Timestamps
    download_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT exports_type_check CHECK (export_type IN ('pdf', 'excel', 'png', 'csv')),
    CONSTRAINT exports_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT exports_download_count_check CHECK (download_count >= 0)
);

-- Indexes
CREATE INDEX idx_exports_dashboard_id ON exports(dashboard_id);
CREATE INDEX idx_exports_user_id ON exports(user_id);
CREATE INDEX idx_exports_status ON exports(status);
CREATE INDEX idx_exports_created_at ON exports(created_at DESC);

-- Comments
COMMENT ON TABLE exports IS 'Dashboard export history and file tracking';
COMMENT ON COLUMN exports.export_type IS 'Export format: pdf, excel, png, or csv';
COMMENT ON COLUMN exports.status IS 'Export status: pending, processing, completed, or failed';

-- ================================================================
-- TABLE 13: USER_ACTIVITY (Audit Log)
-- ================================================================

CREATE TABLE user_activity (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE SET NULL,
    
    -- Activity Data
    action_type VARCHAR(50) NOT NULL,
    action_details JSONB,
    
    -- Session Information
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT activity_action_type_check CHECK (
        action_type IN (
            'register', 'login', 'logout', 'upload_dataset', 'create_dashboard',
            'view_dashboard', 'update_dashboard', 'delete_dashboard', 'share_dashboard',
            'export_dashboard', 'query_data', 'update_profile'
        )
    )
);

-- Indexes
CREATE INDEX idx_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_activity_dashboard_id ON user_activity(dashboard_id);
CREATE INDEX idx_activity_action_type ON user_activity(action_type);
CREATE INDEX idx_activity_created_at ON user_activity(created_at DESC);

-- Comments
COMMENT ON TABLE user_activity IS 'User activity audit log for analytics and security';
COMMENT ON COLUMN user_activity.action_details IS 'Additional action metadata in JSON format';

-- ================================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================================

-- View 1: Dashboard Summary with Aggregated Stats
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT 
    d.id,
    d.user_id,
    d.title,
    d.problem_type,
    d.is_public,
    d.view_count,
    d.created_at,
    d.updated_at,
    u.name as owner_name,
    u.email as owner_email,
    t.display_name as theme_name,
    COUNT(DISTINCT m.id) as model_count,
    COUNT(DISTINCT i.id) as insight_count,
    COUNT(DISTINCT c.id) as chart_count,
    COUNT(DISTINCT e.id) as export_count,
    COUNT(DISTINCT s.id) as share_count,
    MAX(m.test_score) as best_model_score
FROM dashboards d
JOIN users u ON d.user_id = u.id
LEFT JOIN themes t ON d.theme_id = t.id
LEFT JOIN ml_results m ON d.id = m.dashboard_id
LEFT JOIN insights i ON d.id = i.dashboard_id
LEFT JOIN chart_configurations c ON d.id = c.dashboard_id
LEFT JOIN exports e ON d.id = e.dashboard_id
LEFT JOIN dashboard_shares s ON d.id = s.dashboard_id
GROUP BY d.id, u.id, u.name, u.email, t.display_name;

-- View 2: Best Models per Dashboard
CREATE OR REPLACE VIEW best_models AS
SELECT DISTINCT ON (dashboard_id)
    dashboard_id,
    model_name,
    model_type,
    test_score,
    cv_score,
    training_time,
    created_at
FROM ml_results
WHERE is_best_model = TRUE
ORDER BY dashboard_id, cv_score DESC NULLS LAST, test_score DESC;

-- View 3: User Dashboard Statistics
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    u.role,
    COUNT(DISTINCT d.id) as total_dashboards,
    COUNT(DISTINCT d.id) FILTER (WHERE d.is_public = TRUE) as public_dashboards,
    SUM(d.view_count) as total_views,
    MAX(d.created_at) as last_dashboard_created,
    COUNT(DISTINCT e.id) as total_exports,
    COUNT(DISTINCT q.id) as total_queries
FROM users u
LEFT JOIN dashboards d ON u.id = d.user_id
LEFT JOIN exports e ON d.id = e.dashboard_id
LEFT JOIN query_history q ON u.id = q.user_id
GROUP BY u.id, u.name, u.email, u.role;

-- ================================================================
-- FUNCTIONS AND TRIGGERS
-- ================================================================

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-log user activity
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity (user_id, dashboard_id, action_type, action_details)
        VALUES (NEW.user_id, NEW.id, TG_ARGV[0], jsonb_build_object('dashboard_id', NEW.id, 'dashboard_title', NEW.title));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update timestamps on users
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update timestamps on dashboards
CREATE TRIGGER update_dashboards_updated_at 
    BEFORE UPDATE ON dashboards
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update timestamps on themes
CREATE TRIGGER update_themes_updated_at 
    BEFORE UPDATE ON themes
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update timestamps on charts
CREATE TRIGGER update_charts_updated_at 
    BEFORE UPDATE ON chart_configurations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update timestamps on preferences
CREATE TRIGGER update_preferences_updated_at 
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Log dashboard creation
CREATE TRIGGER log_dashboard_creation 
    AFTER INSERT ON dashboards
    FOR EACH ROW 
    EXECUTE FUNCTION log_user_activity('create_dashboard');

-- ================================================================
-- SEED DATA: DEFAULT THEMES
-- ================================================================

INSERT INTO themes (name, display_name, description, colors, is_default, chart_styles) VALUES
-- Theme 1: Light (Default)
('light', 'Light', 'Clean light theme for professional dashboards', 
 '{"primary": "#6366f1", "secondary": "#8b5cf6", "background": "#ffffff", "text": "#111827", "accent": "#f59e0b", "cardBg": "#f9fafb", "border": "#e5e7eb"}'::jsonb, 
 TRUE,
 '{"colors": ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#f43f5e", "#8b5cf6"]}'::jsonb),

-- Theme 2: Dark Mode
('dark', 'Dark Mode', 'Dark theme for reduced eye strain and night work', 
 '{"primary": "#818cf8", "secondary": "#a78bfa", "background": "#0f172a", "text": "#f1f5f9", "accent": "#fbbf24", "cardBg": "#1e293b", "border": "#334155"}'::jsonb, 
 FALSE,
 '{"colors": ["#818cf8", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#22d3ee", "#fb7185", "#c084fc"]}'::jsonb),

-- Theme 3: Professional
('professional', 'Professional', 'Corporate blue theme for business presentations', 
 '{"primary": "#1f77b4", "secondary": "#2ca02c", "background": "#ffffff", "text": "#333333", "accent": "#ff7f0e", "cardBg": "#f8fafc", "border": "#cbd5e1"}'::jsonb, 
 FALSE,
 '{"colors": ["#1f77b4", "#2ca02c", "#ff7f0e", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"]}'::jsonb),

-- Theme 4: Energetic
('energetic', 'Energetic', 'Vibrant green theme for dynamic data visualization', 
 '{"primary": "#10b981", "secondary": "#3b82f6", "background": "#f0fdf4", "text": "#064e3b", "accent": "#f43f5e", "cardBg": "#ffffff", "border": "#86efac"}'::jsonb, 
 FALSE,
 '{"colors": ["#10b981", "#3b82f6", "#f43f5e", "#eab308", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"]}'::jsonb);

-- ================================================================
-- SEED DATA: TEST USER
-- ================================================================

-- Insert admin user (password: Admin123!)
-- Password hash generated with: bcrypt.hashpw('Admin123!'.encode('utf-8'), bcrypt.gensalt())
INSERT INTO users (email, password_hash, name, role, is_active, email_verified) VALUES
('admin@insightai.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ePdDlKoI9Ziy', 'Admin User', 'admin', TRUE, TRUE);

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Count all tables
SELECT 
    'Total Tables' as metric,
    COUNT(*) as value
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- List all tables with row counts
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_name = t.table_name) as column_count,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as table_size
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verify seed data
SELECT 'themes' as table_name, COUNT(*) as row_count FROM themes
UNION ALL
SELECT 'users', COUNT(*) FROM users;

-- ================================================================
-- DATABASE SCHEMA COMPLETE!
-- ================================================================

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE '📊 Total Tables: 13';
    RAISE NOTICE '👁️  Total Views: 3';
    RAISE NOTICE '⚡ Total Triggers: 6';
    RAISE NOTICE '🎨 Default Themes: 4';
    RAISE NOTICE '👤 Test Users: 1 (admin@insightai.com / Admin123!)';
    RAISE NOTICE '🚀 Database is ready for use!';
END $$;
```

---

# How to Use:

1. **Copy the entire SQL above**
2. **Open pgAdmin 4**
3. **Connect to `insight_ai_db`**
4. **Open Query Tool**
5. **Paste and Execute (F5)**

---

# Expected Output:

After running, you should see:
```
✅ Database schema created successfully!
📊 Total Tables: 13
👁️  Total Views: 3
⚡ Total Triggers: 6
🎨 Default Themes: 4
👤 Test Users: 1 (admin@insightai.com / Admin123!)
🚀 Database is ready for use!