import pandas as pd
import io
from sqlalchemy.orm import Session
from app import crud, schemas, models
from datetime import datetime, date
# Standard DB fields that can be mapped
MAPPABLE_FIELDS = {
    "sku": "Product ID / SKU",
    "name": "Product Name",
    "category": "Category",
    "warehouse_name": "Warehouse",
    "quantity": "Quantity",
    "min_stock": "Minimum Stock",
    "max_stock": "Maximum Stock",
    "supplier": "Supplier",
    "purchase_price": "Purchase Price",
    "selling_price": "Selling Price",
    "expiry_date": "Expiry Date"
}
def load_dataframe(file_content: bytes, file_extension: str) -> pd.DataFrame:
    # Loads Excel or CSV into Pandas DataFrame
    ext = file_extension.lower().strip()
    if ext == ".csv":
        return pd.read_csv(io.BytesIO(file_content))
    elif ext in [".xlsx", ".xls"]:
        return pd.read_excel(io.BytesIO(file_content))
    else:
        raise ValueError(f"Unsupported file format: {file_extension}")
def get_file_columns(file_content: bytes, file_extension: str) -> list:
    try:
        df = load_dataframe(file_content, file_extension)
        return df.columns.tolist()
    except Exception as e:
        raise ValueError(f"Could not read file headers: {e}")
def import_file_data(db: Session, file_content: bytes, file_extension: str, mappings: dict) -> dict:
    # mappings structure: {file_column_name: db_field_name}
    df = load_dataframe(file_content, file_extension)
    
    # Invert mapping for easier lookup: {db_field_name: file_column_name}
    inverted_mappings = {v: k for k, v in mappings.items() if v}
    
    success_count = 0
    error_count = 0
    errors = []
    
    # Keep track of warnings
    created_warehouses = set()
    
    for index, row in df.iterrows():
        try:
            # 1. Extract values based on mapping, with sensible fallbacks
            sku_col = inverted_mappings.get("sku")
            sku = str(row[sku_col]).strip() if sku_col in df.columns and pd.notna(row[sku_col]) else None
            
            name_col = inverted_mappings.get("name")
            name = str(row[name_col]).strip() if name_col in df.columns and pd.notna(row[name_col]) else None
            
            if not sku or not name:
                # SKU and Name are required, skip if missing
                raise ValueError("Product ID (SKU) and Product Name are required fields.")
                
            category_col = inverted_mappings.get("category")
            category = str(row[category_col]).strip() if category_col in df.columns and pd.notna(row[category_col]) else "General"
            
            supplier_col = inverted_mappings.get("supplier")
            supplier = str(row[supplier_col]).strip() if supplier_col in df.columns and pd.notna(row[supplier_col]) else None
            
            # Numeric fields
            min_stock_col = inverted_mappings.get("min_stock")
            try:
                min_stock = int(row[min_stock_col]) if min_stock_col in df.columns and pd.notna(row[min_stock_col]) else 10
            except ValueError:
                min_stock = 10
                
            max_stock_col = inverted_mappings.get("max_stock")
            try:
                max_stock = int(row[max_stock_col]) if max_stock_col in df.columns and pd.notna(row[max_stock_col]) else 100
            except ValueError:
                max_stock = 100
                
            purchase_price_col = inverted_mappings.get("purchase_price")
            try:
                purchase_price = float(row[purchase_price_col]) if purchase_price_col in df.columns and pd.notna(row[purchase_price_col]) else 0.0
            except ValueError:
                purchase_price = 0.0
                
            selling_price_col = inverted_mappings.get("selling_price")
            try:
                selling_price = float(row[selling_price_col]) if selling_price_col in df.columns and pd.notna(row[selling_price_col]) else 0.0
            except ValueError:
                selling_price = 0.0
            # Expiry date parsing
            expiry_date = None
            expiry_col = inverted_mappings.get("expiry_date")
            if expiry_col in df.columns and pd.notna(row[expiry_col]):
                raw_expiry = row[expiry_col]
                if isinstance(raw_expiry, (datetime, date)):
                    expiry_date = raw_expiry if isinstance(raw_expiry, date) else raw_expiry.date()
                else:
                    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d"):
                        try:
                            expiry_date = datetime.strptime(str(raw_expiry).strip(), fmt).date()
                            break
                        except ValueError:
                            continue
                            
            # 2. Check if product already exists, otherwise create it
            product = crud.get_product_by_sku(db, sku)
            if product:
                # Update existing product details
                product.name = name
                product.category = category
                product.min_stock = min_stock
                product.max_stock = max_stock
                product.supplier = supplier
                product.purchase_price = purchase_price
                product.selling_price = selling_price
                if expiry_date:
                    product.expiry_date = expiry_date
                product.last_updated = datetime.now()
                db.commit()
            else:
                # Create new product
                product = crud.create_product(db, schemas.ProductCreate(
                    sku=sku,
                    name=name,
                    category=category,
                    min_stock=min_stock,
                    max_stock=max_stock,
                    supplier=supplier,
                    purchase_price=purchase_price,
                    selling_price=selling_price,
                    expiry_date=expiry_date
                ))
                
            # 3. Resolve Warehouse & Stock
            warehouse_col = inverted_mappings.get("warehouse_name")
            warehouse_name = str(row[warehouse_col]).strip() if warehouse_col in df.columns and pd.notna(row[warehouse_col]) else "Main Store"
            
            quantity_col = inverted_mappings.get("quantity")
            try:
                quantity = int(row[quantity_col]) if quantity_col in df.columns and pd.notna(row[quantity_col]) else 0
            except ValueError:
                quantity = 0
            # Check if warehouse exists, otherwise create
            wh = crud.get_warehouse_by_name(db, warehouse_name)
            if not wh:
                wh = crud.create_warehouse(db, schemas.WarehouseCreate(name=warehouse_name))
                created_warehouses.add(warehouse_name)
                
            # 4. Set stock quantity. 
            # Note: For Excel importing, we replace the stock count in this warehouse.
            # We record a movement log.
            stock = db.query(models.ProductStock).filter(
                models.ProductStock.product_id == product.id,
                models.ProductStock.warehouse_id == wh.id
            ).first()
            
            prev_qty = stock.quantity if stock else 0
            diff = quantity - prev_qty
            
            if diff != 0:
                crud.adjust_stock(db, product.id, wh.id, diff)
                
                # Log stock movement
                db_movement = models.StockMovement(
                    product_id=product.id,
                    from_warehouse_id=wh.id if diff < 0 else None,
                    to_warehouse_id=wh.id if diff > 0 else None,
                    quantity=abs(diff),
                    reason=f"Data Import Update (Row {index+2})",
                    transfer_date=date.today()
                )
                db.add(db_movement)
                db.commit()
                
            success_count += 1
            
        except Exception as err:
            error_count += 1
            errors.append(f"Row {index+2}: {str(err)}")
            
    # Log notifications for new warehouses
    if created_warehouses:
        crud.create_notification(
            db, 
            "info", 
            "New Warehouses Created", 
            f"Import added products to new warehouses: {', '.join(created_warehouses)}."
        )
        
    crud.create_notification(
        db, 
        "success", 
        "Data Import Finished", 
        f"Successfully imported {success_count} entries. Errors: {error_count}."
    )
    
    return {
        "success_count": success_count,
        "error_count": error_count,
        "errors": errors[:50]  # Cap list of errors shown
    }
