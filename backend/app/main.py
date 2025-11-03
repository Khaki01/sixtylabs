from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app import models
from app.routers import auth, projects

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sixty Labs API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://sixtylabs.netlify.app",
        "http://13.62.48.57"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(projects.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Sixty Labs API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
