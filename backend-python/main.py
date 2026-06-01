from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import create_tables
from routers import auth_router, users_router, agents_router, posts_router
from routers import simulate_router, network_router, achievements_router, chatbot_router, dev_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield


app = FastAPI(title="UniMind API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router,         prefix="/api/auth",        tags=["auth"])
app.include_router(users_router.router,        prefix="/api/users",       tags=["users"])
app.include_router(agents_router.router,       prefix="/api",             tags=["agents"])
app.include_router(posts_router.router,        prefix="/api",             tags=["posts"])
app.include_router(simulate_router.router,     prefix="/api",             tags=["simulate"])
app.include_router(network_router.router,      prefix="/api",             tags=["network"])
app.include_router(achievements_router.router, prefix="/api",             tags=["achievements"])
app.include_router(chatbot_router.router,      prefix="/api/chatbot",     tags=["chatbot"])
app.include_router(dev_router.router,          prefix="/api/dev",         tags=["developer"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "UniMind API"}
