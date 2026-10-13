"""
Smoke test suite to verify test runner functionality.
"""
import pytest
import fastapi
import polars
import sqlalchemy

def test_environment_smoke():
    """Verify core libraries import and run basic assertions."""
    assert fastapi.__version__ is not None
    assert polars.__version__ is not None
    assert sqlalchemy.__version__ is not None

def test_math_probability_smoke():
    """Verify basic vector arithmetic with Polars."""
    df = polars.DataFrame({"numbers": [3, 9, 16, 29, 30, 44]})
    assert df["numbers"].sum() == 131
    assert len(df) == 6
