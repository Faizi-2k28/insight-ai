import os
import json
import uuid
import pandas as pd
from typing import Optional, List, Any, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from database.models import DatasetStorage

# Configuration
STORAGE_DIR = "storage/datasets"

class DatasetService:
    """
    Handles dataset persistence (writing to disk) and retrieval (reading from disk/DB).
    Ensures backward compatibility with legacy JSONB storage.
    """

    @staticmethod
    def get_storage_path() -> str:
        """Ensure storage directory exists and return it"""
        if not os.path.exists(STORAGE_DIR):
            os.makedirs(STORAGE_DIR, exist_ok=True)
        return STORAGE_DIR

    @staticmethod
    def save_dataset(db: Session, dashboard_id: uuid.UUID, df: pd.DataFrame) -> DatasetStorage:
        """
        Save dataset records in DB JSON storage and write to disk.
        """
        data_records = df.to_dict("records")
        
        # Write to disk
        storage_path = DatasetService.get_storage_path()
        file_path = os.path.join(storage_path, f"{dashboard_id}.json")
        with open(file_path, "w") as f:
            json.dump(data_records, f)

        dataset_storage = db.query(DatasetStorage).filter(
            DatasetStorage.dashboard_id == dashboard_id
        ).first()

        if not dataset_storage:
            dataset_storage = DatasetStorage(dashboard_id=dashboard_id)
            db.add(dataset_storage)

        dataset_storage.data = data_records
        db.flush()
        return dataset_storage

    @staticmethod
    def load_dataset(db: Session, dashboard_id: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Load dataset from DB JSON storage.
        Returns list of dictionaries (records).
        """
        dataset = db.query(DatasetStorage).filter(
            DatasetStorage.dashboard_id == dashboard_id
        ).first()

        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found"
            )

        if dataset.data:
            if isinstance(dataset.data, str):
                return json.loads(dataset.data)
            return dataset.data

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dataset data missing from storage."
        )
