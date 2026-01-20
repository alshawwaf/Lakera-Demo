import unittest
import os
import sys
import json
from datetime import datetime

import logging

# Set test DB URL
db_path = os.path.join(os.getcwd(), 'logs', 'test_logs.db').replace('\\', '/')
os.environ['DATABASE_URL'] = f'sqlite:///{db_path}'

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Create dummy log file
log_file = 'logs/application.log'
os.makedirs('logs', exist_ok=True)
with open(log_file, 'w') as f:
    f.write('2023-10-27 10:00:00\tTest Prompt 1\tSuccess\t{"breakdown": [{"detected": true, "detector_type": "moderated_content/crime"}]}\n')
    f.write('2023-10-27 10:05:00\tTest Prompt 2\tError\tSome error message\n')

# Import app after setting env var and creating log file
from app import app, db, Log

class TestMigration(unittest.TestCase):
    def setUp(self):
        self.app_context = app.app_context()
        self.app_context.push()

    def tearDown(self):
        # Close logging handlers to release file lock
        logger = logging.getLogger()
        for handler in logger.handlers[:]:
            handler.close()
            logger.removeHandler(handler)

        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.app_context.pop()
        # Clean up files
        if os.path.exists('logs/test_logs.db'):
            os.remove('logs/test_logs.db')
        # We don't remove application.log here because other tests might need it or it's fine to leave empty
        # But for cleanliness:
        if os.path.exists(log_file):
            os.remove(log_file)

    def test_migration(self):
        # Check if logs are in DB
        logs = Log.query.all()
        self.assertEqual(len(logs), 2)
        
        # Verify first log
        log1 = Log.query.filter_by(prompt='Test Prompt 1').first()
        self.assertIsNotNone(log1)
        self.assertIn('crime', log1.attack_vectors)
        
        # Verify second log
        log2 = Log.query.filter_by(prompt='Test Prompt 2').first()
        self.assertIsNotNone(log2)
        self.assertEqual(log2.error, 'Some error message')
        
        # Verify file is truncated
        with open(log_file, 'r') as f:
            content = f.read()
        self.assertEqual(content, '')

if __name__ == '__main__':
    unittest.main()
