import sys
import os
# Append current directory to path to locate modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app import database, models, crud, ai_engine, schemas
def run_tests():
    print("==========================================")
    print("   SMART INVENTORY & ERP VERIFICATION    ")
    print("==========================================")
    
    # 1. Test database creation
    print("\n[1/4] Initializing Database & Generating Tables...")
    try:
        models.Base.metadata.create_all(bind=database.engine)
        print(" -> SUCCESS: Database connected and tables generated.")
    except Exception as e:
        print(f" -> ERROR: Database setup failed: {e}")
        return False
        
    db = database.SessionLocal()
    try:
        # 2. Test mock admin user creation
        print("\n[2/4] Verifying Default Authentication Credentials...")
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            crud.create_user(db, schemas.UserCreate(username="admin", password="admin"))
            print(" -> SUCCESS: Seeded default user 'admin'.")
        else:
            print(" -> SUCCESS: Default user 'admin' already registered.")
            
        # 3. Test data seeding
        print("\n[3/4] Running Mock Data Pipeline Seeding...")
        # Clear existing first to ensure fresh seed
        crud.clear_all_data(db)
        
        # Add basic warehouses
        wh1 = crud.create_warehouse(db, schemas.WarehouseCreate(name="Warehouse A", location="Central Sector"))
        wh2 = crud.create_warehouse(db, schemas.WarehouseCreate(name="Factory 1", location="Industrial Estate"))
        print(f" -> Created warehouses: '{wh1.name}', '{wh2.name}'")
        
        # Add basic products
        p1 = crud.create_product(db, schemas.ProductCreate(
            sku="VERIFY-001",
            name="Verification Test Item",
            category="Quality Assurance",
            min_stock=10,
            max_stock=100,
            supplier="QA Labs Inc",
            purchase_price=10.0,
            selling_price=15.0
        ))
        print(f" -> Created product: '{p1.name}' (SKU: {p1.sku})")
        
        # Adjust stock
        crud.adjust_stock(db, p1.id, wh1.id, 5) # Stock is 5, less than min_stock (10) -> should trigger low stock alert!
        print(f" -> Assigned stock to '{wh1.name}': 5 units.")
        
        # 4. Run AI engine checks
        print("\n[4/4] Evaluating AI Rules Engine & Insights Generator...")
        analysis = ai_engine.run_ai_analysis(db)
        
        health = analysis["health_score"]
        recs = analysis["recommendations"]
        insights = analysis["insights"]
        
        print(f" -> Calculated Inventory Health Score: {health}%")
        print(f" -> Compiled Warnings & Recommendations: {len(recs)} active warnings found.")
        for r in recs:
            print(f"    - SKU: {r['product_sku']} | Suggested: {r['suggested_action']} | Reason: {r['reason']}")
            
        print(f" -> Daily Business Insights List: {len(insights)} cards generated.")
        for i in insights:
            print(f"    - {i}")
            
        if len(recs) > 0 and "VERIFY-001" in recs[0]["product_sku"]:
            print("\n==========================================")
            print("   VERIFICATION COMPLETED SUCCESSFULLY    ")
            print("==========================================")
            return True
        else:
            print("\n -> ERROR: AI rules engine did not identify the low stock alert.")
            return False
            
    except Exception as e:
        print(f"\n -> ERROR encountered during test steps: {e}")
        return False
    finally:
        db.close()
if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
