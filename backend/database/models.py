# backend/database/models.py
from sqlalchemy import Column, String, Integer, BigInteger, Float, Boolean, DateTime, Text, ForeignKey, JSON, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

Base = declarative_base()

# ==========================================
# USER MANAGEMENT MODELS
# ==========================================

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    profile_picture_url = Column(String(500))  # â† CHANGED from avatar_url
    role = Column(String(50), default='user')
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships (keep as is)
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    dashboards = relationship("Dashboard", back_populates="user", cascade="all, delete-orphan")
    dashboard_shares = relationship("DashboardShare", foreign_keys="[DashboardShare.created_by]", back_populates="creator")
    preferences = relationship("UserPreferences", uselist=False, back_populates="user", cascade="all, delete-orphan")
    queries = relationship("QueryHistory", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(500), unique=True, nullable=False, index=True)
    login_time = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    device_info = Column(JSONB)  # Added to match SQL schema
    
    # Relationships
    user = relationship("User", back_populates="sessions")


# ==========================================
# THEME MODEL (must be before Dashboard)
# ==========================================

class Theme(Base):
    __tablename__ = "themes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    colors = Column(JSONB, nullable=False)
    fonts = Column(JSONB)
    chart_styles = Column(JSONB)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    preview_image_url = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    dashboards = relationship("Dashboard", back_populates="theme")


# ==========================================
# DASHBOARD & DATA MODELS
# ==========================================

class Dashboard(Base):
    __tablename__ = "dashboards"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    theme_id = Column(UUID(as_uuid=True), ForeignKey("themes.id", ondelete="SET NULL"), nullable=True)  # FK to themes
    title = Column(String(500), nullable=False)
    description = Column(Text)  # Added
    dataset_filename = Column(String(255), nullable=False)
    dataset_url = Column(String(500))  # Added to match SQL schema
    dataset_size_bytes = Column(BigInteger)  # Added to match SQL schema
    target_column = Column(String(255))
    problem_type = Column(String(50))
    row_count = Column(Integer)
    column_count = Column(Integer)
    config = Column(JSONB)
    layout = Column(JSONB)  # Added to match SQL schema
    is_public = Column(Boolean, default=False, index=True)
    view_count = Column(Integer, default=0)  # Added to match SQL schema
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_viewed_at = Column(DateTime)  # Added to match SQL schema
    
    # Relationships
    user = relationship("User", back_populates="dashboards")
    theme = relationship("Theme", back_populates="dashboards")
    ml_results = relationship("MLResult", back_populates="dashboard", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="dashboard", cascade="all, delete-orphan")
    dataset_storage = relationship("DatasetStorage", uselist=False, back_populates="dashboard", cascade="all, delete-orphan")
    shares = relationship("DashboardShare", foreign_keys="[DashboardShare.dashboard_id]", back_populates="dashboard", cascade="all, delete-orphan")
    queries = relationship("QueryHistory", back_populates="dashboard", cascade="all, delete-orphan")
    chart_configurations = relationship("ChartConfiguration", back_populates="dashboard", cascade="all, delete-orphan")
    exports = relationship("Export", back_populates="dashboard", cascade="all, delete-orphan")


class MLResult(Base):
    __tablename__ = "ml_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(255), nullable=False, index=True)
    model_type = Column(String(50), nullable=False)
    test_score = Column(Float, nullable=False)
    cv_score = Column(Float)
    training_time = Column(Float)
    feature_importance = Column(JSONB)
    confusion_matrix = Column(JSONB)
    prediction_samples = Column(JSONB)  # Added to match SQL schema
    hyperparameters = Column(JSONB)
    is_best_model = Column(Boolean, default=False)  # Added to match SQL schema
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    dashboard = relationship("Dashboard", back_populates="ml_results")


class Insight(Base):
    __tablename__ = "insights"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False, index=True)
    insight_type = Column(String(50))
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(String(20), default='medium', index=True)
    category = Column(String(100))
    icon = Column(String(50))
    metadata_info = Column(JSONB)
    confidence_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    dashboard = relationship("Dashboard", back_populates="insights")


class DatasetStorage(Base):
    __tablename__ = "dataset_storage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    data = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    dashboard = relationship("Dashboard", back_populates="dataset_storage")


# ==========================================
# SHARING & PREFERENCES MODELS
# ==========================================

class DashboardShare(Base):
    __tablename__ = "dashboard_shares"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    shared_with_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))  # Added
    share_token = Column(String(100), unique=True, nullable=False, index=True)
    shared_with_email = Column(String(255))  # Added
    permission_level = Column(String(20), default='view')  # Added
    is_public = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)  # Added
    view_count = Column(Integer, default=0)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    accessed_at = Column(DateTime)  # Added
    
    # Relationships
    dashboard = relationship("Dashboard", foreign_keys=[dashboard_id], back_populates="shares")
    creator = relationship("User", foreign_keys=[created_by], back_populates="dashboard_shares")
    shared_with = relationship("User", foreign_keys=[shared_with_user_id])


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    default_theme = Column(String(50), default='light')
    preferences = Column(JSONB)
    notifications_enabled = Column(Boolean, default=True)  # Added to match SQL schema
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="preferences")


class QueryHistory(Base):
    __tablename__ = "query_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id", ondelete="CASCADE"))
    query_text = Column(Text, nullable=False)
    generated_code = Column(Text)
    generated_pandas_code = Column(Text)
    result_data = Column(JSONB)
    execution_time = Column(Float)
    was_successful = Column(Boolean, default=True)  # Added to match SQL schema
    error_message = Column(Text)  # Added to match SQL schema
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="queries")
    dashboard = relationship("Dashboard", back_populates="queries")


# ==========================================
# CHART & EXPORT MODELS
# ==========================================

class ChartConfiguration(Base):
    __tablename__ = "chart_configurations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False, index=True)
    chart_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    x_column = Column(String(100))
    y_column = Column(String(100))
    color_column = Column(String(100))
    aggregation = Column(String(50))
    position = Column(JSONB)
    style = Column(JSONB)
    data_filters = Column(JSONB)
    order_index = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    dashboard = relationship("Dashboard", back_populates="chart_configurations")


class Export(Base):
    __tablename__ = "exports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    export_type = Column(String(20), nullable=False)
    file_url = Column(String(500))
    file_size_bytes = Column(BigInteger)
    status = Column(String(50), default='pending')
    error_message = Column(Text)
    download_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    expires_at = Column(DateTime)
    
    # Relationships
    dashboard = relationship("Dashboard", back_populates="exports")


class UserActivity(Base):
    __tablename__ = "user_activity"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id", ondelete="SET NULL"))
    action_type = Column(String(50), nullable=False)
    action_details = Column(JSONB)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    session_id = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)