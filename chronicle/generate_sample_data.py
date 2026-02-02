#!/usr/bin/env python3
"""
Generate sample events for testing Chronicle calendar.
Run this script to populate the database with sample data.
"""

import sqlite3
import uuid
from datetime import datetime, timedelta
import random
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "chronicle.db")

def generate_sample_data():
    """Generate sample events for testing"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Sample event templates
    work_events = [
        ("Team Standup", "Daily team sync meeting", "cat-1", "#3b82f6"),
        ("Project Review", "Quarterly project status review", "cat-1", "#3b82f6"),
        ("Client Call", "Video call with client", "cat-1", "#3b82f6"),
        ("Code Review", "Review pull requests", "cat-1", "#3b82f6"),
        ("Sprint Planning", "Plan next sprint tasks", "cat-1", "#3b82f6"),
    ]
    
    personal_events = [
        ("Gym", "Morning workout session", "cat-2", "#10b981"),
        ("Lunch with Friends", "Catch up over lunch", "cat-2", "#10b981"),
        ("Reading", "Read a book", "cat-2", "#10b981"),
        ("Learn Spanish", "Practice Spanish for 30 min", "cat-2", "#10b981"),
        ("Meditation", "Morning meditation", "cat-2", "#10b981"),
    ]
    
    family_events = [
        ("Dinner with Family", "Family dinner at home", "cat-3", "#f59e0b"),
        ("Movie Night", "Watch a movie together", "cat-3", "#f59e0b"),
        ("Grocery Shopping", "Weekly grocery run", "cat-3", "#f59e0b"),
        ("Visit Parents", "Visit mom and dad", "cat-3", "#f59e0b"),
        ("Kids Soccer Game", "Saturday soccer match", "cat-3", "#f59e0b"),
    ]
    
    health_events = [
        ("Doctor Appointment", "Annual checkup", "cat-4", "#ef4444"),
        ("Dental Cleaning", "Routine cleaning", "cat-4", "#ef4444"),
        ("Yoga Class", "Evening yoga session", "cat-4", "#ef4444"),
        ("Therapy Session", "Weekly therapy", "cat-4", "#ef4444"),
    ]
    
    all_events = work_events + personal_events + family_events + health_events
    
    # Generate events for the next 30 days
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    now = datetime.now().isoformat()
    
    print("🗓️  Generating sample events...")
    
    for i in range(20):  # Generate 20 random events
        event_template = random.choice(all_events)
        title, description, category, color = event_template
        
        # Random date within next 30 days
        days_offset = random.randint(0, 30)
        event_date = today + timedelta(days=days_offset)
        
        # Random time
        if random.random() > 0.3:  # 70% are timed events
            hour = random.choice([9, 10, 11, 14, 15, 16, 19, 20])
            duration = random.choice([1, 2])
            start_time = event_date.replace(hour=hour)
            end_time = start_time + timedelta(hours=duration)
            all_day = False
        else:  # 30% are all-day events
            start_time = event_date
            end_time = event_date + timedelta(days=1)
            all_day = True
        
        # 10% chance of being recurring
        recurrence = None
        if random.random() < 0.1:
            recurrence = random.choice([
                "FREQ=DAILY",
                "FREQ=WEEKLY",
                "FREQ=MONTHLY"
            ])
        
        event_id = str(uuid.uuid4())
        
        cursor.execute('''
            INSERT INTO events (id, title, description, start_time, end_time, all_day, category, color, recurrence_rule, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            event_id,
            title,
            description,
            start_time.isoformat(),
            end_time.isoformat(),
            int(all_day),
            category,
            color,
            recurrence,
            now,
            now
        ))
        
        print(f"   Created: {title} on {start_time.strftime('%Y-%m-%d')}")
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Generated 20 sample events!")
    print(f"   Database: {DB_PATH}")

if __name__ == "__main__":
    # Initialize database first if needed
    from main import init_db
    init_db()
    
    generate_sample_data()
