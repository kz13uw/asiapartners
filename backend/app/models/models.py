from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, Float, DateTime, Boolean, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"             # Администратор
    ORGANIZER = "organizer"     # Организатор
    SUPPLIER = "supplier"       # Поставщик
    MONITORING = "monitoring"   # Мониторинг
    COMMISSION = "commission"   # Член комиссии
    LAWYER = "lawyer"           # Юрист


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    BLOCKED = "blocked"
    PENDING = "pending"


class TenderMethod(str, enum.Enum):
    ZCP = "zcp"                              # Запрос ценовых предложений (ЗЦП)


class TenderSubjectType(str, enum.Enum):
    GOODS = "goods"                       # Товары
    SERVICES_WORKS = "services_works"     # Услуги / Работы


class TenderStatus(str, enum.Enum):
    DRAFT = "draft"                          # Черновик
    PUBLISHED = "published"                  # Опубликован (Прием заявок)
    ACCEPTING = "published"                  # Синоним для обратной совместимости
    EVALUATION = "evaluation"                # Подведение итогов (Рассмотрение)
    COMPLETED = "completed"                  # Завершен
    CANCELLED = "cancelled"                  # Отменен



class BidStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    QUALIFIED = "qualified"
    REJECTED = "rejected"
    WINNER = "winner"
    RUNNER_UP = "runner_up"     # 2 место (резервный победитель)


class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    SIGNING = "signing"
    ACTIVE = "active"
    COMPLETED = "completed"
    TERMINATED = "terminated"


def generate_account_code(user_id: Optional[int], role: str | UserRole, email: Optional[str] = None) -> str:
    """Генерация кода аккаунта (уникальная почта в качестве ID аккаунта)"""
    if email and str(email).strip():
        return str(email).strip().lower()
    role_val = role.value if isinstance(role, UserRole) else str(role)
    if role_val == UserRole.ADMIN.value:
        prefix = "AID"
    elif role_val == UserRole.ORGANIZER.value:
        prefix = "OID"
    else:
        prefix = "UID"
    uid = user_id or 0
    return f"{prefix}{uid:08d}"


# ============================================================
# МОДЕЛИ
# ============================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    account_code: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    username: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    iin_bin: Mapped[Optional[str]] = mapped_column(String(12), unique=True, index=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.SUPPLIER)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus), default=UserStatus.ACTIVE)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    password_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    company: Mapped[Optional[Company]] = relationship("Company", back_populates="users", foreign_keys="Company.owner_id")
    bids: Mapped[list[Bid]] = relationship("Bid", back_populates="supplier")
    audit_logs: Mapped[list[AuditLog]] = relationship("AuditLog", back_populates="user")

    @property
    def computed_account_code(self) -> str:
        if self.email and self.email.strip():
            return self.email.strip().lower()
        if self.account_code:
            return self.account_code
        if self.id:
            return generate_account_code(self.id, self.role, self.email)
        return ""



class UserCertificate(Base):
    __tablename__ = "user_certificates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    serial_number: Mapped[str] = mapped_column(String(64))
    subject_dn: Mapped[str] = mapped_column(Text)
    valid_from: Mapped[datetime] = mapped_column(DateTime)
    valid_to: Mapped[datetime] = mapped_column(DateTime)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bin: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(512))
    legal_form: Mapped[str] = mapped_column(String(50))   # ТОО, АО, ИП ...
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    iban: Mapped[Optional[str]] = mapped_column(String(34), nullable=True)
    director_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    director_iin: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    is_accredited: Mapped[bool] = mapped_column(Boolean, default=False)
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    users: Mapped[list[User]] = relationship("User", back_populates="company", foreign_keys=[owner_id])
    bids: Mapped[list[Bid]] = relationship("Bid", back_populates="company")


class ProcurementCategory(Base):
    __tablename__ = "procurement_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    subject_type: Mapped[TenderSubjectType] = mapped_column(Enum(TenderSubjectType), default=TenderSubjectType.GOODS)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tenders: Mapped[list[Tender]] = relationship("Tender", back_populates="category")


class Tender(Base):
    __tablename__ = "tenders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subject_type: Mapped[TenderSubjectType] = mapped_column(Enum(TenderSubjectType), default=TenderSubjectType.GOODS)
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("procurement_categories.id"), nullable=True, index=True)
    method: Mapped[TenderMethod] = mapped_column(Enum(TenderMethod), default=TenderMethod.ZCP)
    start_price: Mapped[float] = mapped_column(Float)
    current_lowest_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    step_down_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)      # % шага понижения
    min_step_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)    # минимальный шаг в тенге ₸
    auto_extend_minutes: Mapped[int] = mapped_column(Integer, default=5)           # anti-sniping автопродление
    extension_count: Mapped[int] = mapped_column(Integer, default=0)              # [P2-FIX] Счётчик продлений (макс. 3)
    anti_dumping_pct: Mapped[float] = mapped_column(Float, default=20.0)           # порог демпинга %
    status: Mapped[TenderStatus] = mapped_column(Enum(TenderStatus), default=TenderStatus.DRAFT)
    deadline_at: Mapped[datetime] = mapped_column(DateTime)
    delivery_place: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    organizer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    organizer_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    eds_hash: Mapped[Optional[str]] = mapped_column(Text, nullable=True)       # хэш подписи публикации
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    # 📜 Квалификационный отбор и Лицензирование
    requires_license: Mapped[bool] = mapped_column(Boolean, default=False)
    license_category: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # 🛑 Отмена закупки Заказчиком
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    category: Mapped[Optional[ProcurementCategory]] = relationship("ProcurementCategory", back_populates="tenders")
    organizer: Mapped[User] = relationship("User", foreign_keys=[organizer_id])
    lots: Mapped[list[Lot]] = relationship("Lot", back_populates="tender", cascade="all, delete-orphan")
    qual_requirements: Mapped[list[QualificationRequirement]] = relationship("QualificationRequirement", back_populates="tender", cascade="all, delete-orphan")
    bids: Mapped[list[Bid]] = relationship("Bid", back_populates="tender")
    documents: Mapped[list[TenderDocument]] = relationship("TenderDocument", back_populates="tender")
    protocols: Mapped[list[Protocol]] = relationship("Protocol", back_populates="tender")
    contract: Mapped[Optional[Contract]] = relationship("Contract", back_populates="tender", uselist=False)


class QualificationRequirement(Base):
    __tablename__ = "qualification_requirements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), index=True)
    code: Mapped[str] = mapped_column(String(50), default="general")
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)

    tender: Mapped[Tender] = relationship("Tender", back_populates="qual_requirements")


class Lot(Base):
    __tablename__ = "lots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), index=True)
    lot_number: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[float] = mapped_column(Float, default=1.0)
    unit: Mapped[str] = mapped_column(String(50), default="шт")
    unit_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    start_price: Mapped[float] = mapped_column(Float)
    current_lowest_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # 🧮 Поля Калькулятора НДС и Режима Налогообложения
    vat_mode: Mapped[str] = mapped_column(String(50), default="include_vat")   # include_vat (16%), no_vat (0%), supplier_tax_mode
    vat_rate: Mapped[float] = mapped_column(Float, default=16.0)
    vat_amount: Mapped[Optional[float]] = mapped_column(Float, default=0.0)
    total_price_without_vat: Mapped[Optional[float]] = mapped_column(Float, default=0.0)

    # 📦 Поля для ТОВАРОВ
    brand_or_equivalent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_equivalent_allowed: Mapped[bool] = mapped_column(Boolean, default=True)
    advance_payment_pct: Mapped[float] = mapped_column(Float, default=0.0)
    incoterms: Mapped[Optional[str]] = mapped_column(String(50), default="DDP")
    delivery_days_type: Mapped[Optional[str]] = mapped_column(String(50), default="calendar")
    delivery_days_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # 🛠️ Поля для УСЛУГ / РАБОТ
    service_start_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    service_end_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    warranty_months: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    delivery_place: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    tender: Mapped[Tender] = relationship("Tender", back_populates="lots")
    bid_items: Mapped[list[BidItem]] = relationship("BidItem", back_populates="lot", cascade="all, delete-orphan")


class TenderDocument(Base):
    __tablename__ = "tender_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), index=True)
    doc_type: Mapped[str] = mapped_column(String(50))   # specification, contract_template, ...
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(1024))
    file_size: Mapped[int] = mapped_column(Integer)
    hash_sha256: Mapped[str] = mapped_column(String(64))
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tender: Mapped[Tender] = relationship("Tender", back_populates="documents")


class Bid(Base):
    __tablename__ = "bids"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), index=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    price: Mapped[float] = mapped_column(Float)
    rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)                  # Ранг (1 место, 2 место...)
    is_anti_dumping_flag: Mapped[bool] = mapped_column(Boolean, default=False)       # Флаг демпинга
    status: Mapped[BidStatus] = mapped_column(Enum(BidStatus), default=BidStatus.SUBMITTED)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tech_spec_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)      # Техническая спецификация товара / аналога
    eds_hash: Mapped[Text] = mapped_column(Text)                               # хэш подписи заявки
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # 🔄 Модуль 4: Версионирование и Отзыв заявки с ЭЦП
    version: Mapped[int] = mapped_column(Integer, default=1)
    revocation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    revocation_eds_hash: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)

    tender: Mapped[Tender] = relationship("Tender", back_populates="bids")
    supplier: Mapped[User] = relationship("User", back_populates="bids")
    company: Mapped[Company] = relationship("Company", back_populates="bids")
    items: Mapped[list[BidItem]] = relationship("BidItem", back_populates="bid", cascade="all, delete-orphan")
    documents: Mapped[list[BidDocument]] = relationship("BidDocument", back_populates="bid")


class BidItem(Base):
    __tablename__ = "bid_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bid_id: Mapped[int] = mapped_column(ForeignKey("bids.id"), index=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"), index=True)
    price: Mapped[float] = mapped_column(Float)
    status: Mapped[BidStatus] = mapped_column(Enum(BidStatus), default=BidStatus.SUBMITTED)
    rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 📦 Предложение эквивалентов / аналогов и техническая спецификация
    proposed_brand: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_equivalent: Mapped[bool] = mapped_column(Boolean, default=False)
    proposed_tech_spec: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    bid: Mapped[Bid] = relationship("Bid", back_populates="items")
    lot: Mapped[Lot] = relationship("Lot", back_populates="bid_items")


class SupplierDocument(Base):
    __tablename__ = "supplier_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    doc_type: Mapped[str] = mapped_column(String(50))   # license, st_kz, charter, qualification
    title: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(1024))
    file_size: Mapped[int] = mapped_column(Integer, default=1024)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CategorySubscription(Base):
    __tablename__ = "category_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("procurement_categories.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BidDocument(Base):
    __tablename__ = "bid_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bid_id: Mapped[int] = mapped_column(ForeignKey("bids.id"), index=True)
    qual_req_id: Mapped[Optional[int]] = mapped_column(ForeignKey("qualification_requirements.id"), nullable=True)
    doc_type: Mapped[str] = mapped_column(String(50))
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(1024))
    hash_sha256: Mapped[str] = mapped_column(String(64))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    bid: Mapped[Bid] = relationship("Bid", back_populates="documents")


class Protocol(Base):
    __tablename__ = "protocols"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), index=True)
    protocol_type: Mapped[str] = mapped_column(String(50))  # opening, admission, final
    winner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("bids.id"), nullable=True)
    runner_up_id: Mapped[Optional[int]] = mapped_column(ForeignKey("bids.id"), nullable=True)
    protocol_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pdf_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    eds_hash: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    signed_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    tender: Mapped[Tender] = relationship("Tender", back_populates="protocols")


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    number: Mapped[str] = mapped_column(String(100), unique=True)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), unique=True)
    winner_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    amount: Mapped[float] = mapped_column(Float)
    status: Mapped[ContractStatus] = mapped_column(Enum(ContractStatus), default=ContractStatus.DRAFT)
    pdf_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tender: Mapped[Tender] = relationship("Tender", back_populates="contract")
    winner: Mapped[Company] = relationship("Company")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[Optional[User]] = relationship("User", back_populates="audit_logs")


class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    revoked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50), default="info")   # info, warning, success, danger
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship("User")


class EdsSession(Base):
    __tablename__ = "eds_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    connection_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    nonce: Mapped[str] = mapped_column(String(128))
    action: Mapped[str] = mapped_column(String(50), default="auth") # auth, publish_tender, submit_bid, sign_protocol
    target_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending") # pending, signed, verified, expired
    cms_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    iin_bin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    subject_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)


