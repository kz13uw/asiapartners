from __future__ import annotations
from datetime import datetime
from typing import Optional, Any, Union
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from app.models.models import UserRole, UserStatus, TenderMethod, TenderStatus, BidStatus, ContractStatus, TenderSubjectType, generate_account_code


# ===== AUTH =====

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class EdsLoginRequest(BaseModel):
    """Данные от NCALayer после считывания ЭЦП"""
    cms_base64: str          # CMS подпись в base64
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company_address: Optional[str] = None
    director_name: Optional[str] = None
    company_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    account_code: Optional[str] = None
    role: UserRole
    full_name: str
    is_new_user: bool = False  # True при первом входе через ЭЦП — показать форму доп. данных


class RefreshRequest(BaseModel):
    refresh_token: str


# ===== OTP & REGISTRATION SCHEMAS =====

class SendOtpRequest(BaseModel):
    email: EmailStr
    purpose: Optional[str] = "register"  # "register" или "reset_password"


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str
    purpose: Optional[str] = "register"


class RegisterSupplierRequest(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
    otp_code: str
    full_name: str
    phone: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str



# ===== USERS =====

class UserCreate(BaseModel):
    username: Optional[str] = None
    iin_bin: Optional[str] = None
    full_name: str
    email: Optional[str] = None
    password: Optional[str] = None
    company_address: Optional[str] = None
    role: UserRole = UserRole.SUPPLIER


class UserOut(BaseModel):
    id: int
    account_code: Optional[str] = None
    username: Optional[str] = None
    iin_bin: Optional[str] = None
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company_address: Optional[str] = None
    role: UserRole
    status: UserStatus
    created_at: datetime

    @model_validator(mode='before')
    @classmethod
    def ensure_account_code(cls, data: Any) -> Any:
        if hasattr(data, 'id') and getattr(data, 'id', None):
            uid = getattr(data, 'id')
            role = getattr(data, 'role', UserRole.SUPPLIER)
            email = getattr(data, 'email', None)
            code = getattr(data, 'account_code', None)
            if not code or (email and code != email):
                code = generate_account_code(uid, role, email)
                if hasattr(data, '__dict__'):
                    data.account_code = code
        return data


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


# ===== LOTS & BIDS =====

class LotCreate(BaseModel):
    lot_number: Optional[int] = 1
    title: Optional[str] = "Лот"
    description: Optional[str] = None
    quantity: Optional[float] = 1.0
    unit: Optional[str] = "шт"
    unit_price: Optional[float] = 0.0
    start_price: Optional[float] = 0.0
    vat_mode: Optional[str] = "include_vat"
    vat_rate: Optional[float] = 16.0
    vat_amount: Optional[float] = 0.0
    total_price_without_vat: Optional[float] = 0.0
    brand_or_equivalent: Optional[str] = None
    is_equivalent_allowed: Optional[bool] = True
    advance_payment_pct: Optional[float] = 0.0
    incoterms: Optional[str] = "DDP"
    delivery_days_type: Optional[str] = "calendar"
    delivery_days_count: Optional[int] = None
    service_start_date: Optional[datetime] = None
    service_end_date: Optional[datetime] = None
    warranty_months: Optional[int] = None
    delivery_place: Optional[str] = None


class LotOut(LotCreate):
    id: int
    tender_id: int
    current_lowest_price: Optional[float] = None

    class Config:
        from_attributes = True


class BidItemCreate(BaseModel):
    lot_id: int
    price: float
    proposed_brand: Optional[str] = None
    is_equivalent: Optional[bool] = False
    proposed_tech_spec: Optional[str] = None


class BidItemOut(BidItemCreate):
    id: int
    bid_id: int
    status: BidStatus
    rank: Optional[int] = None
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True


class BidRevoke(BaseModel):
    reason: str
    eds_hash: Optional[str] = "demo_revocation_signature"


class TenderDocumentOut(BaseModel):
    id: int
    tender_id: int
    doc_type: str
    file_name: str
    file_path: str
    file_size: Optional[Union[int, str]] = 1024
    hash_sha256: Optional[str] = None
    uploaded_at: Optional[datetime] = None

    @field_validator("file_size", mode="before")
    @classmethod
    def parse_file_size(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                clean_str = v.replace("МБ", "").replace("MB", "").replace("КБ", "").replace("KB", "").replace(" ", "").replace(",", ".")
                val_float = float(clean_str)
                if "МБ" in v or "MB" in v:
                    return int(val_float * 1024 * 1024)
                elif "КБ" in v or "KB" in v:
                    return int(val_float * 1024)
                return int(val_float)
            except Exception:
                return 1024
        return v or 1024

    class Config:
        from_attributes = True


class BidDocumentCreate(BaseModel):
    qual_req_id: Optional[int] = None
    doc_type: Optional[str] = "supplier_doc"
    file_name: str
    file_path: Optional[str] = None
    file_size: Optional[int] = 1024
    hash_sha256: Optional[str] = None


class BidDocumentOut(BaseModel):
    id: int
    bid_id: int
    qual_req_id: Optional[int] = None
    doc_type: str
    file_name: str
    file_path: str
    hash_sha256: Optional[str] = None
    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TenderBriefOut(BaseModel):
    """Brief tender info for inclusion in BidOut to avoid circular imports"""
    id: int
    number: Optional[str] = None
    title: str
    status: TenderStatus
    deadline_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BidOut(BaseModel):
    id: int
    tender_id: int
    tender: Optional[TenderBriefOut] = None  # [P2-FIX] Нестим данные тендера для кабинета
    supplier_id: int
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    company_bin: Optional[str] = None
    supplier_name: Optional[str] = None
    supplier_email: Optional[str] = None
    supplier_phone: Optional[str] = None
    supplier_address: Optional[str] = None
    director_name: Optional[str] = None
    price: float
    rank: Optional[int] = None
    is_anti_dumping_flag: bool = False
    status: BidStatus
    rejection_reason: Optional[str] = None
    tech_spec_notes: Optional[str] = None
    eds_hash: str
    submitted_at: datetime
    version: int = 1
    revocation_reason: Optional[str] = None
    revoked_at: Optional[datetime] = None
    revocation_eds_hash: Optional[str] = None
    items: list[BidItemOut] = []
    documents: list[BidDocumentOut] = []

    @model_validator(mode='before')
    @classmethod
    def populate_supplier_info(cls, data: Any) -> Any:
        d = getattr(data, '__dict__', {})
        if 'supplier' in d and d['supplier'] is not None:
            sup = d['supplier']
            if not getattr(data, 'supplier_name', None):
                data.supplier_name = getattr(sup, 'full_name', None) or getattr(sup, 'username', None)
            if not getattr(data, 'supplier_email', None):
                data.supplier_email = getattr(sup, 'email', None)
        if 'company' in d and d['company'] is not None:
            comp = d['company']
            if not getattr(data, 'company_name', None):
                data.company_name = getattr(comp, 'full_name', None)
            if not getattr(data, 'company_bin', None):
                data.company_bin = getattr(comp, 'bin', None)
            if not getattr(data, 'supplier_phone', None):
                data.supplier_phone = getattr(comp, 'phone', None)
            if not getattr(data, 'supplier_address', None):
                data.supplier_address = getattr(comp, 'address', None)
            if not getattr(data, 'director_name', None):
                data.director_name = getattr(comp, 'director_name', None)
        return data

    class Config:
        from_attributes = True


class QualificationRequirementCreate(BaseModel):
    code: Optional[str] = "general"
    title: str
    description: Optional[str] = None
    is_mandatory: Optional[bool] = True


class QualificationRequirementOut(QualificationRequirementCreate):
    id: int
    tender_id: int

    class Config:
        from_attributes = True


# ===== TENDERS =====

class TenderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject_type: TenderSubjectType = TenderSubjectType.GOODS
    category_id: Optional[int] = None
    method: TenderMethod = TenderMethod.ZCP
    start_price: float
    step_down_pct: Optional[float] = 1.0
    min_step_amount: Optional[float] = None
    auto_extend_minutes: Optional[int] = 5
    anti_dumping_pct: Optional[float] = 20.0
    deadline_at: datetime
    delivery_place: Optional[str] = None
    requires_license: Optional[bool] = False
    license_category: Optional[str] = None
    lots: Optional[list[LotCreate]] = []
    qual_requirements: Optional[list[QualificationRequirementCreate]] = []
    documents: Optional[list[dict]] = []

    @field_validator("start_price")
    @classmethod
    def price_must_be_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Начальная цена не может быть отрицательной")
        return v


class TenderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject_type: Optional[TenderSubjectType] = None
    category_id: Optional[int] = None
    method: Optional[TenderMethod] = None
    start_price: Optional[float] = None
    deadline_at: Optional[datetime] = None
    delivery_place: Optional[str] = None
    requires_license: Optional[bool] = None
    license_category: Optional[str] = None
    status: Optional[TenderStatus] = None
    documents: Optional[list[dict]] = None
    qual_requirements: Optional[list[QualificationRequirementCreate]] = None
    lots: Optional[list[LotCreate]] = None


class TenderCancel(BaseModel):
    reason: str


class TenderOut(BaseModel):
    id: int
    number: str
    title: str
    description: Optional[str] = None
    subject_type: TenderSubjectType = TenderSubjectType.GOODS
    category_id: Optional[int] = None
    method: TenderMethod
    start_price: float
    current_lowest_price: Optional[float] = None
    step_down_pct: Optional[float] = None
    min_step_amount: Optional[float] = None
    auto_extend_minutes: Optional[int] = 5
    anti_dumping_pct: Optional[float] = 20.0
    status: TenderStatus
    deadline_at: datetime
    delivery_place: Optional[str] = None
    requires_license: bool = False
    license_category: Optional[str] = None
    cancellation_reason: Optional[str] = None
    organizer_id: int
    organizer_code: Optional[str] = None
    organizer_name: Optional[str] = None
    created_at: datetime
    published_at: Optional[datetime] = None
    lots: list[LotOut] = []
    qual_requirements: list[QualificationRequirementOut] = []
    documents: list[TenderDocumentOut] = []

    @model_validator(mode='before')
    @classmethod
    def ensure_organizer_code(cls, data: Any) -> Any:
        if hasattr(data, 'organizer_id') and getattr(data, 'organizer_id', None):
            org_id = getattr(data, 'organizer_id')
            code = getattr(data, 'organizer_code', None)
            if not code:
                code = generate_account_code(org_id, UserRole.ORGANIZER)
                if hasattr(data, '__dict__'):
                    data.organizer_code = code
            # Безопасно проверяем, загружена ли связь organizer в __dict__ объекта
            d = getattr(data, '__dict__', {})
            if 'organizer' in d and d['organizer'] is not None:
                org = d['organizer']
                if hasattr(org, 'full_name'):
                    data.organizer_name = org.full_name
        return data

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
    price: Optional[float] = 0.0
    tech_spec_notes: Optional[str] = None
    eds_hash: Optional[str] = "demo_bid_signature"
    items: Optional[list[BidItemCreate]] = []
    documents: Optional[list[BidDocumentCreate]] = []


class BidStatusUpdate(BaseModel):
    status: BidStatus
    rejection_reason: Optional[str] = None


# ===== PROTOCOLS =====

class ProtocolOut(BaseModel):
    id: int
    tender_id: int
    protocol_type: str
    is_published: bool
    pdf_path: Optional[str] = None
    created_at: datetime
    published_at: Optional[datetime] = None

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
    signed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ===== NOTIFICATIONS =====

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: Optional[str] = "info"


class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

