import sys
import os

# Add the backend directory to sys.path so tests can import from the app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
