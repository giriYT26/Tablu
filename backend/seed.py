import random
from datetime import date, timedelta
from pathlib import Path

from db import DB_PATH, get_connection
from security import hash_password

SCHEMA_PATH = Path(__file__).parent / "schema.sql"

RESTAURANTS = [
    ("Chettinad Spice Court", 13.0878, 80.2785),
    ("Koli Kadai House", 13.0642, 80.2511),
    ("Anjappar Express", 13.1067, 80.2847),
    ("Madras Grill Room", 13.0569, 80.2425),
    ("T Nagar Tandoor", 13.0418, 80.2341),
]

FLOORS = ["Ground", "Rooftop"]
ROWS = 4
COLS = 5


def seed():
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = get_connection()
    conn.executescript(SCHEMA_PATH.read_text())

    TEST_USERS = [
        ("guest", "guest123", 0),
        ("priya", "priya123", 0),
        ("rahul", "rahul123", 0),
        ("admin", "admin123", 1),
    ]

    for username, password, is_admin in TEST_USERS:
        conn.execute(
            "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)",
            (username, hash_password(password), is_admin),
        )

    user_names = [u[0] for u in TEST_USERS]
    user_idx = 0

    for name, lat, lng in RESTAURANTS:
        cur = conn.execute(
            "INSERT INTO restaurants (name, category, latitude, longitude, image) "
            "VALUES (?, 'non-veg', ?, ?, NULL)",
            (name, lat, lng),
        )
        restaurant_id = cur.lastrowid
        seat_ids = []

        for floor_name in FLOORS:
            cur = conn.execute(
                "INSERT INTO floors (restaurant_id, name) VALUES (?, ?)",
                (restaurant_id, floor_name),
            )
            floor_id = cur.lastrowid

            n = 0
            for row in range(1, ROWS + 1):
                for col in range(1, COLS + 1):
                    n += 1
                    capacity = random.choice([2, 2, 4, 4, 6])
                    cur = conn.execute(
                        "INSERT INTO seats (floor_id, label, row, col, capacity) "
                        "VALUES (?, ?, ?, ?, ?)",
                        (floor_id, f"T{n}", row, col, capacity),
                    )
                    seat_ids.append(cur.lastrowid)

        today = date.today().isoformat()
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        for booking_date, slot, count in [
            (today, "19:00", 3),
            (today, "20:00", 2),
            (tomorrow, "19:00", 2),
        ]:
            for seat_id in random.sample(seat_ids, count):
                assigned_user = user_names[user_idx % len(user_names)]
                user_idx += 1
                conn.execute(
                    "INSERT INTO bookings (seat_id, date, time_slot, user_name) "
                    "VALUES (?, ?, ?, ?)",
                    (seat_id, booking_date, slot, assigned_user),
                )

    conn.commit()
    conn.close()
    print(f"Seeded {DB_PATH}")
    print(f"  {len(RESTAURANTS)} restaurants x {len(FLOORS)} floors x {ROWS * COLS} seats")
    print(f"  users: {', '.join([u[0] for u in TEST_USERS])}")
    print("  bookings distributed evenly across all test accounts")


if __name__ == "__main__":
    seed()
