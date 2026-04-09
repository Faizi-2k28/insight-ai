import pandas as pd
import io


def _sanitize_datetimes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert datetime/timedelta columns to ISO-format strings so downstream
    JSON serialization (FastAPI, dataset storage) never chokes on Timestamps.
    """
    dt_cols = df.select_dtypes(include=["datetime", "datetimetz", "timedelta"]).columns
    for col in dt_cols:
        df[col] = df[col].dt.strftime("%Y-%m-%d %H:%M:%S").fillna(df[col].astype(str))

    # Safety net: object columns that pandas silently filled with Timestamps
    for col in df.select_dtypes(include=["object"]).columns:
        sample = df[col].dropna().head(5)
        if len(sample) > 0 and all(isinstance(v, pd.Timestamp) for v in sample):
            df[col] = df[col].apply(lambda v: v.isoformat() if isinstance(v, pd.Timestamp) else v)

    return df


def _sanitize_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert all NaNs, NAs, and Infinites to None to safely insert into Postgres JSONB arrays.
    """
    import numpy as np
    df = df.replace([np.inf, -np.inf], None)
    return df.astype(object).where(pd.notna(df), None)


class DataService:
    @staticmethod
    def process_upload(contents: bytes, filename: str) -> pd.DataFrame:
        """
        Read CSV or Excel bytes with practical encoding fallbacks.
        Raises ValueError if the file format or encoding is invalid.
        """
        if filename.lower().endswith(".xlsx"):
            try:
                df = pd.read_excel(io.BytesIO(contents))
                df = _sanitize_datetimes(df)
                return _sanitize_missing_values(df)
            except ValueError:
                raise
            except Exception as e:
                raise ValueError(f"Excel parsing failed: {str(e)}")

        encodings = ("utf-8", "utf-8-sig", "cp1252", "latin-1")
        last_error = None

        for encoding in encodings:
            try:
                df = pd.read_csv(io.BytesIO(contents), encoding=encoding)
                df = _sanitize_datetimes(df)
                return _sanitize_missing_values(df)
            except UnicodeDecodeError as e:
                last_error = e
                continue
            except pd.errors.EmptyDataError:
                raise ValueError("CSV file is empty")
            except pd.errors.ParserError as e:
                raise ValueError(f"Invalid CSV format: {str(e)}")
            except Exception as e:
                raise ValueError(f"Failed to read CSV file: {str(e)}")

        if last_error:
            raise ValueError(
                "CSV encoding is unsupported. Please upload UTF-8 CSV "
                "or re-save the file from Excel as UTF-8."
            )

        try:
            df = pd.read_csv(io.BytesIO(contents))
            df = _sanitize_datetimes(df)
            return _sanitize_missing_values(df)
        except pd.errors.EmptyDataError:
            raise ValueError("CSV file is empty")
        except pd.errors.ParserError as e:
            raise ValueError(f"Invalid CSV format: {str(e)}")
        except Exception as e:
            raise ValueError(f"Failed to read CSV file: {str(e)}")
