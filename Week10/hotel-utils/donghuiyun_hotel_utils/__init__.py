from __future__ import annotations

from datetime import date, datetime

__all__ = ["nights", "total_price"]


def _parse_date(value: str | date | datetime) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(value)


def nights(
    check_in: str | date | datetime,
    check_out: str | date | datetime,
) -> int:
    """計算入住晚數。

    Args:
        check_in: 入住日期 (格式: YYYY-MM-DD 字串、date 或 datetime)
        check_out: 退房日期 (格式: YYYY-MM-DD 字串、date 或 datetime)

    Returns:
        住宿晚數

    Raises:
        ValueError: 當退房日期早於入住日期，或日期格式錯誤時拋出
    """
    start = _parse_date(check_in)
    end = _parse_date(check_out)
    if end < start:
        raise ValueError("退房日期不能早於入住日期")
    return (end - start).days


def total_price(
    check_in: str | date | datetime,
    check_out: str | date | datetime,
    price_per_night: float,
    discount: float = 1.0,
) -> float:
    """計算訂房總價。

    Args:
        check_in: 入住日期
        check_out: 退房日期
        price_per_night: 每晚房價
        discount: 折扣倍率 (例如 0.9 代表 9 折，預設為 1.0)
    """
    if price_per_night < 0:
        raise ValueError("房價不能小於 0")
    if not (0 < discount <= 1):
        raise ValueError("折扣倍率必須介於 0 到 1 之間")

    num_nights = nights(check_in, check_out)
    return round(num_nights * price_per_night * discount, 2)