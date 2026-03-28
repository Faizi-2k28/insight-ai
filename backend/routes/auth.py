# backend/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import User, Session as SessionModel
from services.auth_service import AuthService
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import re

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


def validate_password(password: str) -> dict:
    """Validate password strength"""
    if len(password) < 8:
        return {"valid": False, "error": "Password must be at least 8 characters long"}
    
    if len(password) > 72:
        return {"valid": False, "error": "Password must be less than 72 characters"}
    
    if not re.search(r"[A-Z]", password):
        return {"valid": False, "error": "Password must contain at least one uppercase letter"}
    
    if not re.search(r"[a-z]", password):
        return {"valid": False, "error": "Password must contain at least one lowercase letter"}
    
    if not re.search(r"\d", password):
        return {"valid": False, "error": "Password must contain at least one number"}
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return {"valid": False, "error": "Password must contain at least one special character"}
    
    return {"valid": True, "error": None}


@router.post("/register", response_model=Token)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password
    password_check = validate_password(user_data.password)
    if not password_check["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=password_check["error"]
        )
    
    # Create user
    hashed_password = AuthService.hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        name=user_data.name,
        role='user'
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create token and session
    access_token = AuthService.create_access_token(
        data={"sub": str(new_user.id), "email": new_user.email}
    )
    
    session = SessionModel(
        user_id=new_user.id,
        token=access_token,
        expires_at=datetime.utcnow() + timedelta(days=7),
        is_active=True
    )
    db.add(session)
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "name": new_user.name,
            "role": new_user.role
        }
    }


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    
    # Find user
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not AuthService.verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create token and session
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    session = SessionModel(
        user_id=user.id,
        token=access_token,
        expires_at=datetime.utcnow() + timedelta(days=7),
        is_active=True
    )
    db.add(session)
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }


async def get_current_active_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current authenticated user"""
    
    token = credentials.credentials  # Extract token without "Bearer "
    
    # Check session
    session = db.query(SessionModel).filter(
        SessionModel.token == token,
        SessionModel.is_active == True,
        SessionModel.expires_at > datetime.utcnow()
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user
    user = db.query(User).filter(User.id == session.user_id).first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Logout user"""
    
    # Deactivate all sessions for this user
    db.query(SessionModel).filter(
        SessionModel.user_id == current_user.id,
        SessionModel.is_active == True
    ).update({"is_active": False})
    
    db.commit()
    
    return {"message": "Successfully logged out"}