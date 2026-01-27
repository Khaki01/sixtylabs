import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Security configuration - use environment variables in production
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production-use-openssl-rand-hex-32")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived access token
REFRESH_TOKEN_EXPIRE_DAYS = 7    # Long-lived refresh token

# Cookie settings
COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"  # Set to true in production with HTTPS
COOKIE_SAMESITE = "lax"  # "strict" for same-site only, "lax" for top-level navigation, "none" for cross-site (requires secure=True)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def generate_token_id() -> str:
    """Generate a unique token identifier for refresh token tracking."""
    return secrets.token_urlsafe(32)


def generate_email_token() -> str:
    """Generate a secure random token for email confirmation."""
    return secrets.token_urlsafe(48)  # 64 characters


EMAIL_TOKEN_EXPIRE_HOURS = 24


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_token_from_cookie(request: Request) -> Optional[str]:
    """Extract access token from HTTPOnly cookie."""
    return request.cookies.get(COOKIE_NAME)


def get_refresh_token_from_cookie(request: Request) -> Optional[str]:
    """Extract refresh token from HTTPOnly cookie."""
    return request.cookies.get(REFRESH_COOKIE_NAME)


async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Get current user from cookie or Authorization header."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Try to get token from cookie first, then fall back to Authorization header
    access_token = get_token_from_cookie(request) or token

    if not access_token:
        raise credentials_exception

    payload = decode_token(access_token)
    if payload is None:
        raise credentials_exception

    # Verify it's an access token
    if payload.get("type") != "access":
        raise credentials_exception

    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception

    user = get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Set HTTPOnly cookies for authentication."""
    # Access token cookie
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    # Refresh token cookie
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/auth"  # Only sent to auth endpoints
    )


def clear_auth_cookies(response: Response):
    """Clear authentication cookies (logout)."""
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/"
    )
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/api/auth"
    )


def create_tokens_for_user(user: models.User) -> tuple[str, str]:
    """Create both access and refresh tokens for a user."""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    token_data = {"sub": user.email}

    access_token = create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data=token_data,
        expires_delta=refresh_token_expires
    )

    return access_token, refresh_token


# Optional: Get current user if authenticated (doesn't raise error if not authenticated)
async def get_current_user_optional(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """Get current user if authenticated, returns None otherwise."""
    access_token = get_token_from_cookie(request) or token

    if not access_token:
        return None

    payload = decode_token(access_token)
    if payload is None or payload.get("type") != "access":
        return None

    email: str = payload.get("sub")
    if email is None:
        return None

    return get_user_by_email(db, email=email)
