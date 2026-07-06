import os
import pytest
from backend.app.gcp import is_gcp_active, get_secret, get_firestore_client, save_to_firestore

def test_is_gcp_active_by_default():
    # In local testing without GOOGLE_CLOUD_PROJECT env, active status should return False
    original_project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    original_credentials = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    
    try:
        if "GOOGLE_CLOUD_PROJECT" in os.environ:
            del os.environ["GOOGLE_CLOUD_PROJECT"]
        if "GOOGLE_APPLICATION_CREDENTIALS" in os.environ:
            del os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
            
        assert is_gcp_active() is False
    finally:
        # Restore original values
        if original_project is not None:
            os.environ["GOOGLE_CLOUD_PROJECT"] = original_project
        if original_credentials is not None:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = original_credentials

def test_get_secret_returns_none_if_inactive():
    assert get_secret("ANY_KEY") is None

def test_get_firestore_client_returns_none_if_inactive():
    assert get_firestore_client() is None

def test_save_to_firestore_returns_false_if_inactive():
    assert save_to_firestore("test_coll", "test_id", {"key": "val"}) is False
