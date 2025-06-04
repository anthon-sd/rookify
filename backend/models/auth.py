from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class RatingProgressEntry(BaseModel):
    rating: int
    timestamp: datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str
    rating: int
    playstyle: str
    rating_progress: List[RatingProgressEntry]

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    rating: Optional[int] = None
    playstyle: Optional[str] = None
    rating_progress: Optional[List[RatingProgressEntry]] = None

class UserInDB(UserBase):
    id: str  # uuid
    hashed_password: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class User(UserBase):
    id: str  # uuid
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None 