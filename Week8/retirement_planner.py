#!/usr/bin/env python3
"""退休資產規劃模擬器（Python 版，僅用標準函式庫）

所有金額以「今天的購買力」計算（已扣除通膨）。
用法範例：
    python retirement_planner.py --age 30 --retire 60 --asset 1000000 --save 25000
    python retirement_planner.py --help
"""
import argparse
import math
import random
from dataclasses import dataclass


@dataclass
class Plan:
    age: int = 30            # 目前年齡
    retire: int = 60         # 預計退休年齡
    life: int = 90           # 預期壽命
    asset: float = 1_000_000  # 目前可投資資產
    save: float = 25_000     # 每月投入
    ret: float = 6.0         # 年報酬率 %
    inf: float = 2.0         # 通膨率 %
    spend: float = 50_000    # 退休後每月生活費
    pension: float = 20_000  # 退休後每月年金（勞保＋勞退）
    vol: float = 12.0        # 年報酬波動度 %

    @property
    def real_return(self) -> float:
        return (1 + self.ret / 100) / (1 + self.inf / 100) - 1

    @property
    def withdraw(self) -> float:
        return max(0.0, self.spend - self.pension)

    @property
    def target(self) -> float:
        """4% 法則：年提領額的 25 倍。"""
        return self.withdraw * 12 * 25


def simulate(p: Plan, save: float | None = None):
    """固定報酬率的平均情境。回傳 (每年資產列表, 退休時資產, 資產用完的年齡或 None)。"""
    save = p.save if save is None else save
    m = (1 + p.real_return) ** (1 / 12) - 1
    bal, depleted_at, at_retire = p.asset, None, p.asset
    path = [(p.age, bal)]
    for age in range(p.age, p.life):
        for i in range(12):
            bal = bal * (1 + m) + (save if age < p.retire else -p.withdraw)
            if bal < 0:
                depleted_at = depleted_at or age + (i + 1) / 12
                bal = 0.0
        if age + 1 == p.retire:
            at_retire = bal
        path.append((age + 1, bal))
    return path, at_retire, depleted_at


def required_saving(p: Plan) -> float:
    """二分搜尋：要撐到預期壽命，每月最少需投入多少。"""
    lo, hi = 0.0, 5_000_000.0
    for _ in range(50):
        mid = (lo + hi) / 2
        if simulate(p, mid)[2] is None:
            hi = mid
        else:
            lo = mid
    return hi


def monte_carlo(p: Plan, runs: int = 1000, seed: int = 12345):
    """對數常態月報酬的蒙地卡羅模擬。回傳 (成功率, 悲觀情境退休資產, 年度 P10/P50/P90)。"""
    rng = random.Random(seed)
    sg = p.vol / 100 / math.sqrt(12)
    mu = math.log(1 + p.real_return) / 12 - sg * sg / 2
    years = p.life - p.age
    cols = [[] for _ in range(years + 1)]
    ok = 0
    for _ in range(runs):
        bal, dead = p.asset, False
        cols[0].append(bal)
        for y in range(years):
            flow = p.save if p.age + y < p.retire else -p.withdraw
            for _ in range(12):
                bal = bal * math.exp(rng.gauss(mu, sg)) + flow
                if bal < 0:
                    bal, dead = 0.0, True
            cols[y + 1].append(bal)
        ok += not dead
    pct = lambda c, q: sorted(c)[int(len(c) * q)]
    bands = [(p.age + i, pct(c, .1), pct(c, .5), pct(c, .9)) for i, c in enumerate(cols)]
    p10_ret = bands[min(years, p.retire - p.age)][1]
    return ok / runs, p10_ret, bands


def ascii_chart(path, width=60, height=12):
    top = max(v for _, v in path) or 1
    step = max(1, len(path) // width)
    pts = path[::step]
    rows = []
    for r in range(height, 0, -1):
        line = "".join("█" if v / top * height >= r - 0.5 else " " for _, v in pts)
        rows.append(f"{top * r / height / 1e4:>8,.0f}萬 |{line}")
    rows.append(" " * 10 + "+" + "-" * len(pts))
    rows.append(f"{'':10} {pts[0][0]}歲{'':>{max(1, len(pts) - 8)}}{pts[-1][0]}歲")
    return "\n".join(rows)


def main():
    ap = argparse.ArgumentParser(description="退休資產規劃模擬器")
    for f, d in Plan().__dict__.items():
        ap.add_argument(f"--{f}", type=type(d), default=d)
    ap.add_argument("--runs", type=int, default=1000, help="蒙地卡羅次數")
    a = vars(ap.parse_args())
    runs = a.pop("runs")
    p = Plan(**a)

    if not p.age < p.retire < p.life:
        raise SystemExit("年齡需滿足：目前年齡 < 退休年齡 < 預期壽命")

    path, at_retire, dep = simulate(p)
    need = required_saving(p)
    rate, p10, _ = monte_carlo(p, runs)

    print("=" * 50)
    print("可行" if dep is None else f"不足：資產約在 {dep:.0f} 歲用完")
    print("=" * 50)
    print(f"退休時資產（平均情境） : {at_retire:>14,.0f} 元")
    print(f"4% 法則目標            : {p.target:>14,.0f} 元")
    print(f"達成度                 : {at_retire / p.target * 100 if p.target else 999:>13.0f} %")
    print(f"最低每月投入           : {need:>14,.0f} 元（目前 {p.save:,.0f}）")
    print(f"市場波動下成功率       : {rate * 100:>13.0f} %（{runs} 次模擬）")
    print(f"悲觀情境退休資產(10%)  : {p10:>14,.0f} 元")
    print()
    print(ascii_chart(path))


if __name__ == "__main__":
    main()