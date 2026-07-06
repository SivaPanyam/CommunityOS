import os
import sys
import pytest

# Add parent directory to sys path so we can resolve backend imports correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
