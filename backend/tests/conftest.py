import pytest
import uuid
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db
from database.models import Base, User
from routes.auth import get_current_active_user
from main import app

SQLALCHEMY_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://insight_user:insight123@localhost:2828/test_insight_ai_db"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Shared test user for auth override (used by tests that request db_user fixture)
_TEST_USER_ID = uuid.uuid4()


@pytest.fixture(scope="session")
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(scope="function")
def db_session(setup_database):
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    # Truncate to remove any rows committed by auth routes during the test
    try:
        session.execute(text("TRUNCATE TABLE sessions, users RESTART IDENTITY CASCADE;"))
        session.commit()
    except Exception:
        pass
    session.close()
    try:
        transaction.rollback()
    except Exception:
        pass
    connection.close()


@pytest.fixture(scope="function", autouse=True)
def override_db(db_session):
    """Always inject the test db_session into every request."""
    def _get_db_override():
        yield db_session
    app.dependency_overrides[get_db] = _get_db_override
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture(scope="function")
def db_user(db_session):
    """
    Insert TEST_USER into the DB and return it.
    Tests that need a pre-seeded authenticated user AND want the global
    auth override should request this fixture.
    """
    user = User(
        id=_TEST_USER_ID,
        email="conftest_user@example.com",
        password_hash="hashed",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture(scope="function")
def override_auth(db_user):
    """
    Opt-in fixture: overrides get_current_active_user to return db_user.
    Request this fixture explicitly in tests that need bypassed auth
    (unit-style integration tests). Do NOT use autouse — tests that do
    real register/login must not have this override active.
    """
    app.dependency_overrides[get_current_active_user] = lambda: db_user
    yield db_user
    app.dependency_overrides.pop(get_current_active_user, None)
