from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app import models, schemas, auth
from app.database import get_db
from app.services.email import send_confirmation_email
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=schemas.SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user and send confirmation email."""
    # Check if email exists
    db_user = auth.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username exists
    db_user = auth.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create new user with email_confirmed=False
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        email_confirmed=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Generate confirmation token
    token = auth.generate_email_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=auth.EMAIL_TOKEN_EXPIRE_HOURS)

    email_token = models.EmailToken(
        token=token,
        user_id=db_user.id,
        token_type="confirmation",
        expires_at=expires_at
    )
    db.add(email_token)
    db.commit()

    # Send confirmation email
    email_sent = send_confirmation_email(
        to_email=db_user.email,
        username=db_user.username,
        token=token
    )

    if not email_sent:
        logger.warning(f"Failed to send confirmation email to {db_user.email}")

    return schemas.SignupResponse(
        message="Please check your email to confirm your account",
        email=db_user.email
    )


@router.post("/login", response_model=schemas.AuthResponse)
def login(user_credentials: schemas.UserLogin, response: Response, db: Session = Depends(get_db)):
    """Authenticate user and set authentication cookies."""
    user = auth.authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if email is confirmed
    if not user.email_confirmed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please confirm your email before logging in"
        )

    # Create tokens and set cookies
    access_token, refresh_token = auth.create_tokens_for_user(user)
    auth.set_auth_cookies(response, access_token, refresh_token)

    return schemas.AuthResponse(
        user=schemas.UserProfile.model_validate(user),
        message="Logged in successfully"
    )


@router.post("/logout", response_model=schemas.MessageResponse)
def logout(response: Response):
    """Clear authentication cookies (logout user)."""
    auth.clear_auth_cookies(response)
    return schemas.MessageResponse(message="Logged out successfully")


@router.post("/refresh", response_model=schemas.MessageResponse)
def refresh_tokens(request: Request, response: Response, db: Session = Depends(get_db)):
    """Refresh access token using refresh token from cookie."""
    refresh_token = auth.get_refresh_token_from_cookie(request)

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )

    # Decode and validate refresh token
    payload = auth.decode_token(refresh_token)
    if payload is None:
        auth.clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Verify it's a refresh token
    if payload.get("type") != "refresh":
        auth.clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )

    # Get user from token
    email = payload.get("sub")
    if not email:
        auth.clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    user = auth.get_user_by_email(db, email=email)
    if not user or not user.is_active:
        auth.clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Create new tokens and set cookies
    new_access_token, new_refresh_token = auth.create_tokens_for_user(user)
    auth.set_auth_cookies(response, new_access_token, new_refresh_token)

    return schemas.MessageResponse(message="Tokens refreshed successfully")


@router.get("/me", response_model=schemas.UserProfile)
async def get_current_user_profile(
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get current authenticated user's profile."""
    return current_user


@router.get("/status", response_model=schemas.AuthStatusResponse)
async def get_auth_status(
    request: Request,
    db: Session = Depends(get_db)
):
    """Check if user is authenticated. Returns user info if authenticated."""
    user = await auth.get_current_user_optional(request, None, db)

    if user and user.is_active:
        return schemas.AuthStatusResponse(
            authenticated=True,
            user=schemas.UserProfile.model_validate(user)
        )

    return schemas.AuthStatusResponse(authenticated=False)


@router.get("/confirm-email/{token}", response_model=schemas.EmailConfirmationResponse)
def confirm_email(token: str, db: Session = Depends(get_db)):
    """Confirm user's email address using the token from the confirmation email."""
    # Find the token
    email_token = db.query(models.EmailToken).filter(
        models.EmailToken.token == token,
        models.EmailToken.token_type == "confirmation"
    ).first()

    if not email_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid confirmation token"
        )

    # Check if token is expired
    if email_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation token has expired. Please request a new one."
        )

    # Check if token was already used
    if email_token.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This confirmation link has already been used"
        )

    # Get the user
    user = db.query(models.User).filter(models.User.id == email_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )

    # Mark email as confirmed
    now = datetime.now(timezone.utc)
    user.email_confirmed = True
    user.email_confirmed_at = now
    email_token.used_at = now

    db.commit()
    db.refresh(user)

    return schemas.EmailConfirmationResponse(
        message="Email confirmed successfully. You can now sign in.",
        user=schemas.UserProfile.model_validate(user)
    )


@router.post("/resend-confirmation", response_model=schemas.MessageResponse)
def resend_confirmation(request: schemas.ResendConfirmationRequest, db: Session = Depends(get_db)):
    """Resend confirmation email. Always returns success to prevent email enumeration."""
    user = auth.get_user_by_email(db, email=request.email)

    # Always return success to prevent email enumeration
    if not user or user.email_confirmed:
        return schemas.MessageResponse(message="If your email exists in our system and is not yet confirmed, you will receive a confirmation email shortly.")

    # Invalidate existing unused tokens for this user
    db.query(models.EmailToken).filter(
        models.EmailToken.user_id == user.id,
        models.EmailToken.token_type == "confirmation",
        models.EmailToken.used_at.is_(None)
    ).update({"used_at": datetime.now(timezone.utc)})

    # Generate new confirmation token
    token = auth.generate_email_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=auth.EMAIL_TOKEN_EXPIRE_HOURS)

    email_token = models.EmailToken(
        token=token,
        user_id=user.id,
        token_type="confirmation",
        expires_at=expires_at
    )
    db.add(email_token)
    db.commit()

    # Send confirmation email
    email_sent = send_confirmation_email(
        to_email=user.email,
        username=user.username,
        token=token
    )

    if not email_sent:
        logger.warning(f"Failed to resend confirmation email to {user.email}")

    return schemas.MessageResponse(message="If your email exists in our system and is not yet confirmed, you will receive a confirmation email shortly.")
