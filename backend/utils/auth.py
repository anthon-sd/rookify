from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from models.auth import TokenData, UserInDB
import os
from dotenv import load_dotenv
from config.database import supabase, USERS_TABLE

# Load .env from the project root directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

# Security configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")  # Change in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    print(f"AUTH DEBUG: get_current_user called")
    print(f"AUTH DEBUG: token length: {len(token) if token else 0}")
    print(f"AUTH DEBUG: SECRET_KEY: {SECRET_KEY}")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        print("AUTH DEBUG: No token provided")
        raise credentials_exception
    
    try:
        print(f"AUTH DEBUG: Decoding JWT with secret: {SECRET_KEY}")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        print(f"AUTH DEBUG: Token decoded, email: {email}")
        if email is None:
            print("AUTH DEBUG: No email in token payload")
            raise credentials_exception
    except JWTError as e:
        print(f"AUTH DEBUG: JWT decode error: {str(e)}")
        print(f"AUTH DEBUG: Token: {token}")
        raise credentials_exception

    # Fetch user from Supabase
    print(f"AUTH DEBUG: Fetching user from database: {email}")
    try:
        result = supabase.table(USERS_TABLE).select("*").eq("email", email).single().execute()
        print(f"AUTH DEBUG: Database result: {bool(result.data)}")
        if not result.data:
            print(f"AUTH DEBUG: User not found: {email}")
            raise credentials_exception

        user = result.data
        print(f"AUTH DEBUG: User found: {user.get('id')}")
        return UserInDB(**user)
    except Exception as db_error:
        print(f"AUTH DEBUG: Database error: {str(db_error)}")
        raise credentials_exception 