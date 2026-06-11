import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends

from db import get_db
from auth import hash_password, verify_password, create_access_token
from models.user import SignupRequest, LoginRequest, TokenResponse

router = APIRouter()


@router.post("/signup", response_model=TokenResponse)
async def signup(payload: SignupRequest, db=Depends(get_db)):
    cursor = await db.execute("SELECT id FROM users WHERE email = ?", (payload.email,))
    existing = await cursor.fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    pw_hash = hash_password(payload.password)

    await db.execute(
        "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, payload.email.lower().strip(), pw_hash, payload.name.strip(), created_at),
    )
    await db.commit()

    token = create_access_token(user_id, payload.name.strip())
    return TokenResponse(access_token=token, user_id=user_id, name=payload.name.strip())


@router.post("/guest", response_model=TokenResponse)
async def guest_login(db=Depends(get_db)):
    guest_email = "guest@unimind.app"
    cursor = await db.execute("SELECT id, name FROM users WHERE email = ?", (guest_email,))
    user = await cursor.fetchone()

    if not user:
        user_id = "guest-00000000-0000-0000-0000-000000000000"
        created_at = datetime.now(timezone.utc).isoformat()
        pw_hash = hash_password("__guest__")
        await db.execute(
            "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, guest_email, pw_hash, "Explorer", created_at),
        )
        await db.commit()
        name = "Explorer"
    else:
        user_id = user["id"]
        name = user["name"]

    token = create_access_token(user_id, name)
    return TokenResponse(access_token=token, user_id=user_id, name=name)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, password_hash, name FROM users WHERE email = ?",
        (payload.email.lower().strip(),),
    )
    user = await cursor.fetchone()

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user["id"], user["name"])
    return TokenResponse(access_token=token, user_id=user["id"], name=user["name"])
