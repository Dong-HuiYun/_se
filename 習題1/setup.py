from setuptools import setup

setup(
    name="mycurl",
    version="0.1.0",
    description="一個使用 Python 標準函式庫實作的簡易 curl 複製品",
    py_modules=["mycurl"],
    python_requires=">=3.7",
    entry_points={
        "console_scripts": [
            "mycurl=mycurl:main",
        ],
    },
)
