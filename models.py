from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    location = Column(String, nullable=True)
    # Relationships
    stocks = relationship("ProductStock", back_populates="warehouse", cascade="all, delete-orphan")
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)  # Product ID / SKU
    name = Column(String, index=True, nullable=False)
    category = Column(String, index=True, nullable=True)
    min_stock = Column(Integer, default=10)
    max_stock = Column(Integer, default=100)
    supplier = Column(String, index=True, nullable=True)
    purchase_price = Column(Float, default=0.0)
    selling_price = Column(Float, default=0.0)
    expiry_date = Column(Date, nullable=True)
    last_updated = Column(DateTime(timezone=True), onupdate=func.now(), default=func.now())
    # Relationships
    stocks = relationship("ProductStock", back_populates="product", cascade="all, delete-orphan")
    movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")
    invoice_items = relationship("InvoiceItem", back_populates="product")
    purchase_orders = relationship("PurchaseOrder", back_populates="product", cascade="all, delete-orphan")
class ProductStock(Base):
    __tablename__ = "product_stocks"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Integer, default=0)
    # Relationships
    product = relationship("Product", back_populates="stocks")
    warehouse = relationship("Warehouse", back_populates="stocks")
class StockMovement(Base):
    __tablename__ = "stock_movements"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    to_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    transfer_date = Column(Date, default=func.current_date())
    reason = Column(String, nullable=False)  # e.g., "Transfer", "Purchase", "Sale", "Import", "Adjustment"
    timestamp = Column(DateTime(timezone=True), default=func.now())
    # Relationships
    product = relationship("Product", back_populates="movements")
    from_warehouse = relationship("Warehouse", foreign_keys=[from_warehouse_id])
    to_warehouse = relationship("Warehouse", foreign_keys=[to_warehouse_id])
class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, nullable=False)  # "sale" or "purchase"
    partner_name = Column(String, nullable=False)  # Customer Name or Supplier Name
    date = Column(Date, nullable=False)
    total_amount = Column(Float, default=0.0)
    status = Column(String, default="pending")  # "paid", "pending", "cancelled"
    created_at = Column(DateTime(timezone=True), default=func.now())
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    # Relationships
    invoice = relationship("Invoice", back_populates="items")
    product = relationship("Product", back_populates="invoice_items")
    warehouse = relationship("Warehouse")
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # "warning", "info", "success", "danger"
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), default=func.now())
class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(Integer, primary_key=True, index=True)
    supplier = Column(String, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    reason = Column(Text, nullable=True)
    expected_demand = Column(Integer, nullable=True)
    status = Column(String, default="pending")  # "pending", "approved", "rejected"
    created_at = Column(DateTime(timezone=True), default=func.now())
    product = relationship("Product", back_populates="purchase_orders")
class SystemSettings(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, index=True)
    currency = Column(String, default="₹")
    units = Column(String, default="units")
    low_stock_limit = Column(Integer, default=10)
    expiry_warning_days = Column(Integer, default=30)
    theme = Column(String, default="dark")
    language = Column(String, default="English")
