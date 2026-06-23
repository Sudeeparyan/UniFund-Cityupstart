import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from db import get_db

SECRET_KEY = os.getenv("JWT_SECRET", "fallback_secret_change_me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Developer credentials (override via env vars in production)
DEV_CREDENTIALS = [
    {"email": os.getenv("DEV_EMAIL_1", "admin@unimind.dev"),  "password": os.getenv("DEV_PASS", "unimind-dev-2025")},
    {"email": os.getenv("DEV_EMAIL_2", "team@unimind.dev"),   "password": os.getenv("DEV_PASS", "unimind-dev-2025")},
]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# Use bcrypt directly. passlib 1.7.4's bcrypt backend self-test breaks on
# bcrypt >= 4.1/5.x ("password cannot be longer than 72 bytes"); going direct is
# robust across versions and still verifies existing passlib-made $2b$ hashes.
# bcrypt only uses the first 72 bytes, so we truncate to avoid the 5.x ValueError.
def hash_password(password: str) -> str:
    pw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, name: str) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "name": name, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_dev_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=12)
    payload = {"sub": email, "role": "developer", "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def validate_dev_credentials(email: str, password: str) -> bool:
    return any(c["email"] == email and c["password"] == password for c in DEV_CREDENTIALS)


async def get_dev_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "developer":
            raise HTTPException(status_code=403, detail="Developer access required")
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired developer token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = await cursor.fetchone()

    if user is None:
        raise credentials_exception
    return dict(user)
