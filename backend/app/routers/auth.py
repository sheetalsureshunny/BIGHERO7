from fastapi import APIRouter, Depends, Form, Header, HTTPException

from ..services import security, store

router = APIRouter(prefix="/api/auth", tags=["auth"])


def current_user(authorization: str = Header(default="")) -> dict:
    token = authorization.removeprefix("Bearer ").strip()
    user = store.get_user_by_token(token)
    if user is None:
        raise HTTPException(401, "Not logged in")
    return user


def _public(user: dict) -> dict:
    return {k: v for k, v in user.items() if k not in {"password_hash", "token"}}


@router.post("/register")
def register(
    name: str = Form(..., min_length=2),
    email: str = Form(...),
    password: str = Form(..., min_length=6),
):
    if store.get_user_by_email(email):
        raise HTTPException(400, "Email already registered — log in instead")
    token = security.make_token()
    user = store.create_user(name, email, security.hash_password(password), token)
    return {"token": token, "user": _public(user)}


@router.post("/login")
def login(email: str = Form(...), password: str = Form(...)):
    row = store.get_user_by_email(email)
    if row is None or not row.get("password_hash") or not security.verify_password(
        password, row["password_hash"]
    ):
        raise HTTPException(401, "Invalid email or password")
    token = security.make_token()
    store.set_token(row["id"], token)
    user = store.get_user(row["id"])
    return {"token": token, "user": _public(user)}


@router.post("/logout")
def logout(user: dict = Depends(current_user)):
    store.set_token(user["id"], None)
    return {"ok": True}


@router.get("/me")
def me(user: dict = Depends(current_user)):
    return _public(user)
