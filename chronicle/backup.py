#!/usr/bin/env python3
"""
Backup and restore utility for Chronicle calendar database.
"""

import sqlite3
import shutil
import os
import sys
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "chronicle.db")
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")

def ensure_backup_dir():
    """Ensure backup directory exists"""
    os.makedirs(BACKUP_DIR, exist_ok=True)

def backup():
    """Create a backup of the database"""
    if not os.path.exists(DB_PATH):
        print("❌ No database found to backup.")
        return
    
    ensure_backup_dir()
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(BACKUP_DIR, f"chronicle_backup_{timestamp}.db")
    
    shutil.copy2(DB_PATH, backup_path)
    print(f"✅ Backup created: {backup_path}")

def restore(backup_file=None):
    """Restore database from backup"""
    ensure_backup_dir()
    
    if backup_file:
        backup_path = backup_file
    else:
        # Find most recent backup
        backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith('.db')], reverse=True)
        if not backups:
            print("❌ No backups found.")
            return
        backup_path = os.path.join(BACKUP_DIR, backups[0])
    
    if not os.path.exists(backup_path):
        print(f"❌ Backup file not found: {backup_path}")
        return
    
    # Confirm before overwriting
    response = input(f"⚠️  This will overwrite your current database. Continue? (yes/no): ")
    if response.lower() != 'yes':
        print("Restore cancelled.")
        return
    
    # Backup current database first
    if os.path.exists(DB_PATH):
        temp_backup = os.path.join(BACKUP_DIR, f"chronicle_pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db")
        shutil.copy2(DB_PATH, temp_backup)
        print(f"📦 Current database backed up to: {temp_backup}")
    
    shutil.copy2(backup_path, DB_PATH)
    print(f"✅ Database restored from: {backup_path}")

def list_backups():
    """List all available backups"""
    ensure_backup_dir()
    
    backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith('.db')], reverse=True)
    
    if not backups:
        print("📂 No backups found.")
        return
    
    print("📂 Available backups:")
    for i, backup in enumerate(backups, 1):
        backup_path = os.path.join(BACKUP_DIR, backup)
        size = os.path.getsize(backup_path) / 1024  # KB
        modified = datetime.fromtimestamp(os.path.getmtime(backup_path)).strftime("%Y-%m-%d %H:%M:%S")
        print(f"   {i}. {backup} ({size:.1f} KB) - {modified}")

def main():
    if len(sys.argv) < 2:
        print("Chronicle Backup Utility")
        print("=" * 40)
        print("\nUsage:")
        print("  python3 backup.py backup              - Create a new backup")
        print("  python3 backup.py restore             - Restore from most recent backup")
        print("  python3 backup.py restore <file>      - Restore from specific backup")
        print("  python3 backup.py list                - List all backups")
        print("\nBackup directory:", BACKUP_DIR)
        return
    
    command = sys.argv[1]
    
    if command == "backup":
        backup()
    elif command == "restore":
        backup_file = sys.argv[2] if len(sys.argv) > 2 else None
        restore(backup_file)
    elif command == "list":
        list_backups()
    else:
        print(f"❌ Unknown command: {command}")

if __name__ == "__main__":
    main()
