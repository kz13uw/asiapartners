from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from app.models.models import UserRole, UserStatus, TenderMethod, TenderStatus, BidStatus, ContractStatus


# ===== AUTH =====

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class EdsLoginRequest(BaseModel):
    """Данные от NCALayer после считывания ЭЦП"""
    cms_base64: str          # CMS подпись в base64


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    role: UserRole
    full_name: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ===== USERS =====

class UserCreate(BaseModel):
    iin_bin: str
    full_name: str
    email: EmailStr
    password: Optional[str] = None
    role: UserRole = UserRole.SUPPLIER


class UserOut(BaseModel):
    id: int
    iin_bin: str
    full_name: str
    email: str
    role: UserRole
    status: UserStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ===== COMPANY =====

class CompanyCreate(BaseModel):
    bin: str
    full_name: str
    legal_form: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    iban: Optional[str] = None
    director_name: Optional[str] = None
    director_iin: Optional[str] = None


class CompanyOut(CompanyCreate):
    id: int
    is_accredited: bool
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===== TENDERS =====

class TenderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    method: TenderMethod
    start_price: float
    step_down_pct: Optional[float] = None
    deadline_at: datetime
    delivery_place: Optional[str] = None

    @field_validator("start_price")
    @classmethod
    def price_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Начальная цена должна быть больше нуля")
        return v


class TenderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline_at: Optional[datetime] = None
    delivery_place: Optional[str] = None


class TenderOut(BaseModel):
    id: int
    number: str
    title: str
    description: Optional[str]
    method: TenderMethod
    start_price: float
    step_down_pct: Optional[float]
    status: TenderStatus
    deadline_at: datetime
    delivery_place: Optional[str]
    organizer_id: int
    created_at: datetime
    published_at: Optional[datetime]

    class Config:
        from_attributes = True


class TenderListOut(BaseModel):
    items: list[TenderOut]
    total: int
    page: int
    size: int


# ===== BIDS =====

class BidCreate(BaseModel):
    tender_id: int
    price: float
    eds_hash: str   # хэш подписанной заявки

    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Цена должна быть больше нуля")
        return v


class BidStatusUpdate(BaseModel):
    status: BidStatus
    rejection_reason: Optional[str] = None


class BidOut(BaseModel):
    id: int
    tender_id: int
    supplier_id: int
    company_id: int
    price: float
    status: BidStatus
    rejection_reason: Optional[str]
    submitted_at: datetime

    class Config:
        from_attributes = True


# ===== PROTOCOLS =====

class ProtocolOut(BaseModel):
    id: int
    tender_id: int
    protocol_type: str
    is_published: bool
    pdf_path: Optional[str]
    created_at: datetime
    published_at: Optional[datetime]

    class Config:
        from_attributes = True


# ===== CONTRACTS =====

class ContractOut(BaseModel):
    id: int
    number: str
    tender_id: int
    winner_id: int
    amount: float
    status: ContractStatus
    signed_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
