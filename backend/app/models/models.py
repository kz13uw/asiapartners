import enum
from datetime import datetime
from sqlalchemy import String, Text, Integer, Float, DateTime, Boolean, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class UserRole(str, enum.Enum):
    SUPPLIER = "supplier"       # Контрагент/Поставщик
    ORGANIZER = "organizer"     # Специалист по закупкам
    COMMISSION = "commission"   # Член комиссии
    LAWYER = "lawyer"           # Юрист
    ADMIN = "admin"             # Администратор


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    BLOCKED = "blocked"
    PENDING = "pending"


class TenderMethod(str, enum.Enum):
    ONE_STAGE = "one_stage"         # Одноэтапный на понижение
    TWO_STAGE = "two_stage"         # Двухэтапный на понижение
    DIRECT = "direct"               # Прямая закупка


class TenderStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ACCEPTING = "accepting"     # Прием заявок
    QUALIFICATION = "qualification"  # 1 этап — квалификация
    AUCTION = "auction"         # Торги/Аукцион
    EVALUATION = "evaluation"   # Оценка
    COMPLETED = "completed"     # Завершен
    CANCELLED = "cancelled"     # Отменен


class BidStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    QUALIFIED = "qualified"
    REJECTED = "rejected"
    WINNER = "winner"


class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    SIGNING = "signing"
    ACTIVE = "active"
    COMPLETED = "completed"
    TERMINATED = "terminated"


# ============================================================
# МОДЕЛИ
# ============================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    iin_bin: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.SUPPLIER)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus), default=UserStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    company: Mapped["Company | None"] = relationship("Company", back_populates="users", foreign_keys="Company.owner_id")
    bids: Mapped[list["Bid"]] = relationship("Bid", back_populates="supplier")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="user")


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
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    iban: Mapped[str | None] = mapped_column(String(34), nullable=True)
    director_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    director_iin: Mapped[str | None] = mapped_column(String(12), nullable=True)
    is_accredited: Mapped[bool] = mapped_column(Boolean, default=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    users: Mapped[list[User]] = relationship("User", back_populates="company", foreign_keys=[owner_id])
    bids: Mapped[list["Bid"]] = relationship("Bid", back_populates="company")


class Tender(Base):
    __tablename__ = "tenders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    method: Mapped[TenderMethod] = mapped_column(Enum(TenderMethod))
    start_price: Mapped[float] = mapped_column(Float)
    step_down_pct: Mapped[float | None] = mapped_column(Float, nullable=True)  # % шага понижения
    status: Mapped[TenderStatus] = mapped_column(Enum(TenderStatus), default=TenderStatus.DRAFT)
    deadline_at: Mapped[datetime] = mapped_column(DateTime)
    delivery_place: Mapped[str | None] = mapped_column(String(512), nullable=True)
    organizer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    eds_hash: Mapped[str | None] = mapped_column(String(256), nullable=True)  # хэш подписи публикации
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    organizer: Mapped[User] = relationship("User", foreign_keys=[organizer_id])
    bids: Mapped[list["Bid"]] = relationship("Bid", back_populates="tender")
    documents: Mapped[list["TenderDocument"]] = relationship("TenderDocument", back_populates="tender")
    protocols: Mapped[list["Protocol"]] = relationship("Protocol", back_populates="tender")
    contract: Mapped["Contract | None"] = relationship("Contract", back_populates="tender", uselist=False)


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
    status: Mapped[BidStatus] = mapped_column(Enum(BidStatus), default=BidStatus.SUBMITTED)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    eds_hash: Mapped[str] = mapped_column(String(256))   # хэш подписи заявки
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tender: Mapped[Tender] = relationship("Tender", back_populates="bids")
    supplier: Mapped[User] = relationship("User", back_populates="bids")
    company: Mapped[Company] = relationship("Company", back_populates="bids")
    documents: Mapped[list["BidDocument"]] = relationship("BidDocument", back_populates="bid")


class BidDocument(Base):
    __tablename__ = "bid_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bid_id: Mapped[int] = mapped_column(ForeignKey("bids.id"), index=True)
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
    pdf_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    eds_hash: Mapped[str | None] = mapped_column(String(256), nullable=True)
    signed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    tender: Mapped[Tender] = relationship("Tender", back_populates="protocols")


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    number: Mapped[str] = mapped_column(String(100), unique=True)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), unique=True)
    winner_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    amount: Mapped[float] = mapped_column(Float)
    status: Mapped[ContractStatus] = mapped_column(Enum(ContractStatus), default=ContractStatus.DRAFT)
    pdf_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    signed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tender: Mapped[Tender] = relationship("Tender", back_populates="contract")
    winner: Mapped[Company] = relationship("Company")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payload: Mapped[str | None] = mapped_column(Text, nullable=True)   # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User | None] = relationship("User", back_populates="audit_logs")
