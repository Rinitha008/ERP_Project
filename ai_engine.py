from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from app import crud, models
import math
def calculate_similarity(a: str, b: str) -> float:
    # Quick string similarity helper
    a, b = a.lower().strip(), b.lower().strip()
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0
    
    # Simple edit distance ratio
    distances = range(len(a) + 1)
    for i2, c2 in enumerate(b):
        distances_ = [i2+1]
        for i1, c1 in enumerate(a):
            if c1 == c2:
                distances_.append(distances[i1])
            else:
                distances_.append(1 + min((distances[i1], distances[i1 + 1], distances_[-1])))
        distances = distances_
    
    dist = distances[-1]
    max_len = max(len(a), len(b))
    return 1.0 - (dist / max_len)
def run_ai_analysis(db: Session):
    products = db.query(models.Product).all()
    warehouses = db.query(models.Warehouse).all()
    settings = crud.get_system_settings(db)
    
    health_score = 100
    recommendations = []
    insights = []
    notifications_to_create = []
    
    total_products_count = len(products)
    unhealthy_count = 0
    
    # Helper to calculate sales velocity (demand estimation)
    # Get sales movements in the last 14 days
    fourteen_days_ago = date.today() - timedelta(days=14)
    sales_movements = db.query(models.StockMovement).filter(
        models.StockMovement.from_warehouse_id != None,
        models.StockMovement.to_warehouse_id == None,
        models.StockMovement.transfer_date >= fourteen_days_ago
    ).all()
    
    # Map product_id -> units sold in 14 days
    sales_map = {}
    for sm in sales_movements:
        sales_map[sm.product_id] = sales_map.get(sm.product_id, 0) + sm.quantity
        
    # Check 1: Inactive products (no movement in last 90 days)
    ninety_days_ago = date.today() - timedelta(days=90)
    all_movements_last_90 = db.query(models.StockMovement).filter(
        models.StockMovement.transfer_date >= ninety_days_ago
    ).all()
    active_product_ids = {sm.product_id for sm in all_movements_last_90}
    
    # Check 2: Dead Stock (no sales in last 45 days)
    forty_five_days_ago = date.today() - timedelta(days=45)
    sales_last_45 = db.query(models.StockMovement).filter(
        models.StockMovement.from_warehouse_id != None,
        models.StockMovement.to_warehouse_id == None,
        models.StockMovement.transfer_date >= forty_five_days_ago
    ).all()
    recent_sales_product_ids = {sm.product_id for sm in sales_last_45}
    # Estimated purchase requirements for next week
    estimated_purchase_cost = 0.0
    # 1. Product-level analysis
    for p in products:
        total_qty = sum(stock.quantity for stock in p.stocks)
        sales_qty = sales_map.get(p.id, 0)
        daily_sales_rate = sales_qty / 14.0
        
        is_healthy = True
        
        # A. Out of Stock Check
        if total_qty == 0:
            is_healthy = False
            unhealthy_count += 1
            suggested_po_qty = p.min_stock + int(daily_sales_rate * 7)
            suggested_po_qty = max(suggested_po_qty, 10)
            
            recommendations.append({
                "product_sku": p.sku,
                "product_name": p.name,
                "current_stock": 0,
                "required_stock": p.min_stock,
                "suggested_action": f"Order {suggested_po_qty} units immediately.",
                "reason": "Product is completely out of stock, causing lost sales opportunities."
            })
            notifications_to_create.append({
                "type": "danger",
                "title": f"Out of Stock: {p.name}",
                "message": f"Product {p.name} ({p.sku}) is completely out of stock. Suggested replenishment: {suggested_po_qty} units."
            })
            
            # Estimate purchase cost
            estimated_purchase_cost += suggested_po_qty * p.purchase_price
            
        # B. Low Stock Check
        elif total_qty <= p.min_stock:
            is_healthy = False
            unhealthy_count += 1
            suggested_po_qty = (p.max_stock - total_qty)
            suggested_po_qty = max(suggested_po_qty, 5)
            
            # Simple reason phrasing
            reason_text = "Stock is below minimum threshold."
            if sales_qty > 0:
                reason_text = f"Sales velocity is {daily_sales_rate:.1f} units/day. Current stock is insufficient."
                
            recommendations.append({
                "product_sku": p.sku,
                "product_name": p.name,
                "current_stock": total_qty,
                "required_stock": p.min_stock,
                "suggested_action": f"Purchase {suggested_po_qty} more units.",
                "reason": reason_text
            })
            notifications_to_create.append({
                "type": "warning",
                "title": f"Low Stock Warning: {p.name}",
                "message": f"{p.name} is running low. Current stock is {total_qty} (min: {p.min_stock}). Suggested purchase: {suggested_po_qty} units."
            })
            
            estimated_purchase_cost += suggested_po_qty * p.purchase_price
        # C. Overstocked Check
        elif total_qty >= p.max_stock:
            is_healthy = False
            unhealthy_count += 1
            excess = total_qty - p.max_stock
            
            recommendations.append({
                "product_sku": p.sku,
                "product_name": p.name,
                "current_stock": total_qty,
                "required_stock": p.max_stock,
                "suggested_action": "Pause purchasing.",
                "reason": f"Inventory level ({total_qty}) exceeds maximum target of {p.max_stock} units."
            })
            notifications_to_create.append({
                "type": "info",
                "title": f"Overstock Notice: {p.name}",
                "message": f"{p.name} is overstocked. Pause purchasing. Excess units: {excess}."
            })
            
        # D. Expiry Date Check
        if p.expiry_date:
            days_to_expiry = (p.expiry_date - date.today()).days
            if days_to_expiry < 0:
                is_healthy = False
                unhealthy_count += 1
                recommendations.append({
                    "product_sku": p.sku,
                    "product_name": p.name,
                    "current_stock": total_qty,
                    "required_stock": 0,
                    "suggested_action": "Dispose/Scrap expired stock.",
                    "reason": f"Product expired on {p.expiry_date.strftime('%Y-%m-%d')}."
                })
                notifications_to_create.append({
                    "type": "danger",
                    "title": f"Expired Stock: {p.name}",
                    "message": f"{p.name} expired on {p.expiry_date.strftime('%Y-%m-%d')}. Dispose safely."
                })
            elif days_to_expiry <= settings.expiry_warning_days:
                is_healthy = False
                unhealthy_count += 1
                recommendations.append({
                    "product_sku": p.sku,
                    "product_name": p.name,
                    "current_stock": total_qty,
                    "required_stock": total_qty,
                    "suggested_action": "Run clearance promotion or move to high-demand branch.",
                    "reason": f"Product expires in {days_to_expiry} days (Date: {p.expiry_date.strftime('%Y-%m-%d')})."
                })
                notifications_to_create.append({
                    "type": "warning",
                    "title": f"Near Expiry: {p.name}",
                    "message": f"{p.name} expires in {days_to_expiry} days on {p.expiry_date.strftime('%Y-%m-%d')}."
                })
                
        # E. Dead Stock Check (No sales in 45 days, and has stock)
        if total_qty > 0 and p.id not in recent_sales_product_ids:
            # Check if product is relatively new (created or updated recently)
            # If updated in last 45 days, but not sold, we flag it
            is_healthy = False
            unhealthy_count += 1
            recommendations.append({
                "product_sku": p.sku,
                "product_name": p.name,
                "current_stock": total_qty,
                "required_stock": total_qty,
                "suggested_action": "Reduce price or bundle with fast-moving goods.",
                "reason": "No sales have been recorded for this product in the last 45 days."
            })
            notifications_to_create.append({
                "type": "info",
                "title": f"Dead Stock: {p.name}",
                "message": f"Product {p.name} has not sold in the last 45 days. Consider promotions."
            })
            
        # F. Fast-moving Product Notice (Sales velocity high)
        if daily_sales_rate > 3.0:
            insights.append(f"Fast-Moving Item: {p.name} sells {daily_sales_rate:.1f} units per day. Ensure replenishment pipeline is active.")
            
        # G. Inactive Product Check (No stock changes of any type in 90 days)
        if p.id not in active_product_ids:
            insights.append(f"Inactive Product: {p.name} has had zero activity (purchases, sales, transfers) for over 90 days.")
        # H. Warehouse Imbalance Check (For products in multiple warehouses)
        if len(p.stocks) > 1:
            stock_list = sorted(p.stocks, key=lambda x: x.quantity)
            lowest = stock_list[0]
            highest = stock_list[-1]
            if lowest.quantity <= p.min_stock / 2 and highest.quantity >= p.max_stock * 0.7:
                # Warehouse imbalance! Move stock.
                transfer_qty = int((highest.quantity - lowest.quantity) / 2)
                if transfer_qty > 0:
                    recommendations.append({
                        "product_sku": p.sku,
                        "product_name": p.name,
                        "current_stock": total_qty,
                        "required_stock": p.min_stock,
                        "suggested_action": f"Move {transfer_qty} units from {highest.warehouse.name} to {lowest.warehouse.name}.",
                        "reason": f"{lowest.warehouse.name} is running critically low ({lowest.quantity}) while {highest.warehouse.name} has excess ({highest.quantity})."
                    })
                    notifications_to_create.append({
                        "type": "warning",
                        "title": f"Stock Imbalance: {p.name}",
                        "message": f"Move {transfer_qty} units of {p.name} from {highest.warehouse.name} to {lowest.warehouse.name} to resolve imbalance."
                    })
    # 2. Duplicate entries check (using similarity)
    for i in range(len(products)):
        for j in range(i + 1, len(products)):
            p1 = products[i]
            p2 = products[j]
            sim = calculate_similarity(p1.name, p2.name)
            if sim > 0.85 and p1.category == p2.category:
                insights.append(f"Possible Duplicate Products: '{p1.name}' ({p1.sku}) and '{p2.name}' ({p2.sku}) are {sim*100:.0f}% similar. Consider merging them.")
    # 3. Calculate health score
    if total_products_count > 0:
        # Normalize unhealthy count to avoid negative percentages
        unhealthy_ratio = unhealthy_count / total_products_count
        health_score = int(max(0, 100 - (unhealthy_ratio * 100)))
    # 4. Generate general insights text lists
    low_count = sum(1 for r in recommendations if "Purchase" in r["suggested_action"] or "Order" in r["suggested_action"])
    over_count = sum(1 for r in recommendations if "Pause" in r["suggested_action"])
    exp_count = sum(1 for r in recommendations if "expires" in r["reason"] or "expired" in r["reason"])
    
    insights.insert(0, f"Overall inventory health is {health_score}%.")
    if low_count > 0:
        insights.append(f"{low_count} products need immediate restocking.")
    if over_count > 0:
        insights.append(f"{over_count} products are currently overstocked.")
    if exp_count > 0:
        insights.append(f"{exp_count} products are expired or near expiry.")
        
    # Warehouse specific stock counts
    for wh in warehouses:
        wh_total = sum(stock.quantity for stock in wh.stocks)
        wh_lows = sum(1 for stock in wh.stocks if stock.quantity <= stock.product.min_stock)
        if wh_lows > 3:
            insights.append(f"Warehouse '{wh.name}' requires urgent replenishment ({wh_lows} items low).")
            notifications_to_create.append({
                "type": "warning",
                "title": f"Warehouse Warning: {wh.name}",
                "message": f"Warehouse {wh.name} has {wh_lows} low-stock products. Replenish soon."
            })
        elif wh_total > 5000:
            insights.append(f"Warehouse '{wh.name}' has high capacity storage ({wh_total} units).")
    # Add general positive message if healthy
    if health_score >= 90 and len(recommendations) == 0:
        insights.append("Inventory levels look healthy across all warehouses.")
        notifications_to_create.append({
            "type": "success",
            "title": "Healthy Inventory Status",
            "message": "Inventory levels look healthy. No stock-outs or overstock warnings."
        })
    # Save generated notifications to DB
    for notif in notifications_to_create:
        crud.create_notification(db, notif["type"], notif["title"], notif["message"])
    return {
        "health_score": health_score,
        "recommendations": recommendations,
        "insights": insights,
        "estimated_purchase_cost": estimated_purchase_cost
    }
def generate_procurement_suggestions(db: Session):
    # Generates suggested purchase orders automatically based on low stock
    products = db.query(models.Product).all()
    suggestions = []
    
    # Fourteen days sales
    fourteen_days_ago = date.today() - timedelta(days=14)
    sales = db.query(models.StockMovement).filter(
        models.StockMovement.from_warehouse_id != None,
        models.StockMovement.to_warehouse_id == None,
        models.StockMovement.transfer_date >= fourteen_days_ago
    ).all()
    
    sales_map = {}
    for s in sales:
        sales_map[s.product_id] = sales_map.get(s.product_id, 0) + s.quantity
        
    for p in products:
        total_qty = sum(stock.quantity for stock in p.stocks)
        if total_qty <= p.min_stock:
            sales_qty = sales_map.get(p.id, 0)
            daily_sales_rate = sales_qty / 14.0
            
            # Suggest quantity to reach max stock + cover average weekly demand
            expected_demand = int(daily_sales_rate * 7)
            suggested_qty = (p.max_stock - total_qty) + expected_demand
            suggested_qty = max(suggested_qty, 10)
            
            # Rounded to nearest 10
            suggested_qty = int(math.ceil(suggested_qty / 10.0)) * 10
            
            reason = f"Current stock ({total_qty}) is below the minimum required limit of {p.min_stock}."
            if sales_qty > 0:
                reason += f" Sales velocity is {daily_sales_rate:.1f} units/day. Purchasing {suggested_qty} units is advised to cover demand."
                
            suggestions.append({
                "product_sku": p.sku,
                "product_name": p.name,
                "supplier": p.supplier or "Default Supplier",
                "suggested_quantity": suggested_qty,
                "reason": reason,
                "expected_demand": expected_demand
            })
            
            # Check if there is already a pending Purchase Order for this product
            pending_po = db.query(models.PurchaseOrder).filter(
                models.PurchaseOrder.product_id == p.id,
                models.PurchaseOrder.status == "pending"
            ).first()
            
            if not pending_po:
                # Automatically create a pending Purchase Order!
                crud.create_purchase_order(db, schemas.PurchaseOrderCreate(
                    product_sku=p.sku,
                    quantity=suggested_qty,
                    supplier=p.supplier or "Default Supplier",
                    reason=reason,
                    expected_demand=expected_demand
                ))
                
    return suggestions
