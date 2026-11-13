from donghuiyun_hotel_utils import nights, total_price

# 1. 計算入住幾晚
days = nights("2026-11-13", "2026-11-16")
print(f"總共住 {days} 晚")  # 輸出: 總共住 3 晚

# 2. 計算打 9 折後的總房價
price = total_price("2026-11-13", "2026-11-16", 3000, discount=0.9)
print(f"總金額 {price} 元")  # 輸出: 總金額 8100.0 元