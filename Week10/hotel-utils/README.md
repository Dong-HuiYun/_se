# donghuiyun-hotel-utils

[![PyPI version](https://img.shields.io/pypi/v/donghuiyun-hotel-utils.svg)](https://pypi.org/project/donghuiyun-hotel-utils/)
[![Python](https://img.shields.io/badge/python-%3E%3D3.9-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

一個輕量、零依賴且具備完整型別提示的 Python 旅館訂房日期與價格計算工具。

## 功能特色

- **精準天數計算**：使用 Python 標準庫 `datetime.date` 計算日曆天數，避免毫秒換算可能產生的時區誤差。
- **彈性日期格式**：支援傳入 `YYYY-MM-DD` 字串、`datetime.date` 或 `datetime.datetime` 物件。
- **防呆驗證**：當退房日期早於入住日期、或房價／折扣不合理時，主動拋出明確的 `ValueError`。
- **型別友善**：提供完整 Type Hints，在 VS Code / PyCharm 可享有自動補全提示。

## 安裝方式

```bash
pip install donghuiyun_hotel_utils
```

## 快速開始

```python
from datetime import date
from donghuiyun_hotel_utils import nights, total_price

# 1. 計算住宿晚數（支援字串或 date 物件）
print(nights("2026-11-13", "2026-11-16"))            # 輸出: 3
print(nights(date(2026, 11, 13), date(2026, 11, 15))) # 輸出: 2

# 2. 計算總房價（例如每晚 3000 元，打 9 折）
print(total_price("2026-11-13", "2026-11-16", 3000, discount=0.9))
# 輸出: 8100.0
```

### 錯誤處理範例

```python
from donghuiyun_hotel_utils import nights

try:
    nights("2026-11-16", "2026-11-13")
except ValueError as e:
    print(e)  # 輸出: 退房日期不能早於入住日期
```

## API 說明

### `nights(check_in, check_out) -> int`
計算入住與退房之間的住宿晚數。

| 參數 | 型別 | 說明 |
| :--- | :--- | :--- |
| `check_in` | `str \| date \| datetime` | 入住日期（字串格式需為 `YYYY-MM-DD`） |
| `check_out` | `str \| date \| datetime` | 退房日期（字串格式需為 `YYYY-MM-DD`） |

### `total_price(check_in, check_out, price_per_night, discount=1.0) -> float`
計算訂房總金額（結果四捨五入至小數點後兩位）。

| 參數 | 型別 | 預設值 | 說明 |
| :--- | :--- | :--- | :--- |
| `check_in` | `str \| date \| datetime` | 必填 | 入住日期 |
| `check_out` | `str \| date \| datetime` | 必填 | 退房日期 |
| `price_per_night` | `float` | 必填 | 每晚房價（不可小於 0） |
| `discount` | `float` | `1.0` | 折扣倍率（例如 `0.9` 代表 9 折，範圍 `0 < discount <= 1`） |

## 授權條款

本專案採用 [MIT License](https://opensource.org/licenses/MIT) 授權。