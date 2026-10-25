import re
import sqlite3
import secrets
from datetime import datetime, timedelta, timezone
from math import asin, cos, radians, sin, sqrt
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory, session

from db import get_connection
from security import hash_password, verify_password

FRONTEND = Path(__file__).parent.parent / "frontend"

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SLOT_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
USERNAME_RE = re.compile(r"^[a-z0-9_]{3,20}$")
HOLD_SECONDS = 300

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse_date_slot(date_str, slot):
    if not DATE_RE.match(date_str):
        return None, (jsonify({"error": "date must be YYYY-MM-DD"}), 400)
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return None, (jsonify({"error": "date must be a real calendar date"}), 400)
    if not SLOT_RE.match(slot):
        return None, (jsonify({"error": "slot must be HH:MM"}), 400)
    return (date_str, slot), None


def parse_seats(seat_ids, allow_empty=False):
    if not isinstance(seat_ids, list) or not all(isinstance(i, int) for i in seat_ids):
        return None, (jsonify({"error": "seats must be a list of ids"}), 400)
    if not seat_ids and not allow_empty:
        return None, (jsonify({"error": "seats must be a non-empty list of ids"}), 400)
    if len(set(seat_ids)) != len(seat_ids):
        return None, (jsonify({"error": "duplicate seat ids"}), 400)
    return seat_ids, None


def seats_exist(conn, seat_ids):
    if not seat_ids:
        return True
    placeholders = ",".join("?" * len(seat_ids))
    rows = conn.execute(
        f"SELECT id FROM seats WHERE id IN ({placeholders})", seat_ids
    ).fetchall()
    return len(rows) == len(seat_ids)


def current_user():
    username = session.get("user")
    if not username:
        return None
    conn = get_connection()
    row = conn.execute(
        "SELECT id, username, is_admin FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def expire_holds(conn):
    conn.execute("DELETE FROM holds WHERE expires_at <= ?", (now_iso(),))


@app.get("/api/me")
def me():
    return jsonify({"user": current_user()})


@app.post("/api/register")
def register():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON body required"}), 400
    username = str(body.get("username", "")).lower().strip()
    password = body.get("password", "")
    if not USERNAME_RE.match(username):
        return jsonify({"error": "username must be 3-20 letters, digits or _"}), 400
    if not isinstance(password, str) or len(password) < 8:
        return jsonify({"error": "password must be at least 8 characters"}), 400

    conn = get_connection()
    exists = conn.execute(
        "SELECT 1 FROM users WHERE username = ?", (username,)
    ).fetchone()
    if exists:
        conn.close()
        return jsonify({"error": "that username is taken"}), 409
    conn.execute(
        "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 0)",
        (username, hash_password(password)),
    )
    conn.commit()
    conn.close()
    session["user"] = username
    return jsonify({"user": {"username": username, "is_admin": 0}}), 201


@app.post("/api/login")
def login():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON body required"}), 400
    username = str(body.get("username", "")).lower().strip()
    password = body.get("password", "")
    conn = get_connection()
    row = conn.execute(
        "SELECT username, password_hash, is_admin FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    conn.close()
    if row is None or not verify_password(password, row["password_hash"]):
        return jsonify({"error": "wrong username or password"}), 401
    session["user"] = row["username"]
    return jsonify({"user": {"username": row["username"], "is_admin": row["is_admin"]}})


@app.post("/api/logout")
def logout():
    session.clear()
    return "", 204


def haversine_km(lat1, lng1, lat2, lng2):
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    )
    return 2 * 6371 * asin(sqrt(a))


@app.get("/api/restaurants")
def list_restaurants():
    q = request.args.get("q", "").strip()
    lat_raw = request.args.get("lat")
    lng_raw = request.args.get("lng")

    if lat_raw is None and lng_raw is None:
        user_lat = user_lng = None
    elif lat_raw is None or lng_raw is None:
        return jsonify({"error": "lat and lng must be provided together"}), 400
    else:
        try:
            user_lat = float(lat_raw)
            user_lng = float(lng_raw)
        except ValueError:
            return jsonify({"error": "lat and lng must be numbers"}), 400
        if not (-90 <= user_lat <= 90 and -180 <= user_lng <= 180):
            return jsonify({"error": "lat/lng out of range"}), 400

    sql = """
        SELECT r.id, r.name, r.category, r.latitude, r.longitude, r.image,
               (SELECT COUNT(*) FROM floors f WHERE f.restaurant_id = r.id) AS floors,
               (SELECT COUNT(*) FROM seats s JOIN floors f ON s.floor_id = f.id
                 WHERE f.restaurant_id = r.id) AS tables,
               (SELECT MAX(s.row) FROM seats s JOIN floors f ON s.floor_id = f.id
                 WHERE f.restaurant_id = r.id AND f.name = 'Ground') AS grid_rows,
               (SELECT MAX(s.col) FROM seats s JOIN floors f ON s.floor_id = f.id
                 WHERE f.restaurant_id = r.id AND f.name = 'Ground') AS grid_cols
          FROM restaurants r
    """
    params = []
    if q:
        sql += " WHERE r.name LIKE ?"
        params.append(f"%{q}%")
    sql += " ORDER BY r.id"

    conn = get_connection()
    rows = conn.execute(sql, params).fetchall()
    conn.close()

    restaurants = [dict(row) for row in rows]
    if user_lat is not None:
        for r in restaurants:
            r["distance_km"] = haversine_km(
                user_lat, user_lng, r["latitude"], r["longitude"]
            )
        restaurants.sort(key=lambda r: r["distance_km"])
    return jsonify(restaurants)


@app.get("/api/restaurants/<int:restaurant_id>")
def restaurant_details(restaurant_id):
    conn = get_connection()
    restaurant = conn.execute(
        "SELECT id, name, category, latitude, longitude, image FROM restaurants WHERE id = ?",
        (restaurant_id,),
    ).fetchone()
    if restaurant is None:
        conn.close()
        return jsonify({"error": "restaurant not found"}), 404

    floors = conn.execute(
        "SELECT id, name FROM floors WHERE restaurant_id = ? ORDER BY id",
        (restaurant_id,),
    ).fetchall()

    floor_ids = [f["id"] for f in floors]
    seats = []
    if floor_ids:
        placeholders = ",".join("?" * len(floor_ids))
        seats = conn.execute(
            f"SELECT id, floor_id, label, row, col, capacity FROM seats "
            f"WHERE floor_id IN ({placeholders}) ORDER BY id",
            floor_ids,
        ).fetchall()
    conn.close()

    return jsonify(
        {
            "restaurant": dict(restaurant),
            "floors": [dict(f) for f in floors],
            "seats": [dict(s) for s in seats],
        }
    )


@app.get("/api/restaurants/<int:restaurant_id>/seats")
def restaurant_seats(restaurant_id):
    date_str = request.args.get("date", "")
    slot = request.args.get("slot", "")
    _, err = parse_date_slot(date_str, slot)
    if err:
        return err

    user = current_user()
    me = user["username"] if user else ""

    conn = get_connection()
    exists = conn.execute(
        "SELECT 1 FROM restaurants WHERE id = ?", (restaurant_id,)
    ).fetchone()
    if exists is None:
        conn.close()
        return jsonify({"error": "restaurant not found"}), 404
    expire_holds(conn)

    rows = conn.execute(
        """
        SELECT f.id AS floor_id, f.name AS floor_name,
               s.id, s.label, s.row, s.col, s.capacity,
               CASE WHEN b.id IS NOT NULL THEN 'booked'
                    WHEN h.id IS NOT NULL AND h.user_name != ? THEN 'held'
                    ELSE 'free' END AS status
          FROM floors f
          LEFT JOIN seats s ON s.floor_id = f.id
          LEFT JOIN bookings b
                 ON b.seat_id = s.id AND b.date = ? AND b.time_slot = ?
          LEFT JOIN holds h
                 ON h.seat_id = s.id AND h.date = ? AND h.time_slot = ?
                AND h.expires_at > ?
         WHERE f.restaurant_id = ?
         ORDER BY f.id, s.id
        """,
        (me, date_str, slot, date_str, slot, now_iso(), restaurant_id),
    ).fetchall()
    conn.commit()
    conn.close()

    floors = []
    index = {}
    for row in rows:
        floor_id = row["floor_id"]
        if floor_id not in index:
            index[floor_id] = {"id": floor_id, "name": row["floor_name"], "seats": []}
            floors.append(index[floor_id])
        if row["id"] is not None:
            index[floor_id]["seats"].append(
                {
                    "id": row["id"],
                    "label": row["label"],
                    "row": row["row"],
                    "col": row["col"],
                    "capacity": row["capacity"],
                    "status": row["status"],
                }
            )

    return jsonify({"date": date_str, "slot": slot, "floors": floors})


@app.post("/api/bookings")
def create_booking():
    user = current_user()
    if user is None:
        return jsonify({"error": "log in required"}), 401

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON body required"}), 400

    seat_ids, err = parse_seats(body.get("seats"))
    if err:
        return err
    parsed, err = parse_date_slot(body.get("date", ""), body.get("slot", ""))
    if err:
        return err
    date_str, slot = parsed

    conn = get_connection()
    placeholders = ",".join("?" * len(seat_ids))

    if not seats_exist(conn, seat_ids):
        conn.close()
        return jsonify({"error": "unknown seat id"}), 400

    conflicts = conn.execute(
        f"""
        SELECT s.id FROM seats s
          JOIN bookings b ON b.seat_id = s.id
         WHERE s.id IN ({placeholders}) AND b.date = ? AND b.time_slot = ?
        """,
        [*seat_ids, date_str, slot],
    ).fetchall()
    if conflicts:
        conn.close()
        return (
            jsonify(
                {
                    "error": "seat already taken",
                    "conflicts": [c["id"] for c in conflicts],
                }
            ),
            409,
        )

    held = conn.execute(
        f"""
        SELECT seat_id FROM holds
         WHERE seat_id IN ({placeholders}) AND date = ? AND time_slot = ?
           AND user_name != ? AND expires_at > ?
        """,
        [*seat_ids, date_str, slot, user["username"], now_iso()],
    ).fetchall()
    if held:
        conn.close()
        return (
            jsonify(
                {
                    "error": "seat held by someone else",
                    "conflicts": [h["seat_id"] for h in held],
                }
            ),
            409,
        )

    try:
        created = []
        for seat_id in seat_ids:
            cur = conn.execute(
                "INSERT INTO bookings (seat_id, date, time_slot, user_name) "
                "VALUES (?, ?, ?, ?)",
                (seat_id, date_str, slot, user["username"]),
            )
            created.append(
                {"id": cur.lastrowid, "seat_id": seat_id, "date": date_str, "time_slot": slot}
            )
        conn.execute(
            f"DELETE FROM holds WHERE seat_id IN ({placeholders}) "
            "AND date = ? AND time_slot = ? AND user_name = ?",
            [*seat_ids, date_str, slot, user["username"]],
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.rollback()
        conn.close()
        return jsonify({"error": "seat already taken"}), 409
    conn.close()
    return jsonify({"bookings": created}), 201


@app.post("/api/holds")
def sync_holds():
    user = current_user()
    if user is None:
        return jsonify({"error": "log in required"}), 401

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON body required"}), 400

    seat_ids, err = parse_seats(body.get("seats"), allow_empty=True)
    if err:
        return err
    parsed, err = parse_date_slot(body.get("date", ""), body.get("slot", ""))
    if err:
        return err
    date_str, slot = parsed

    conn = get_connection()
    if not seats_exist(conn, seat_ids):
        conn.close()
        return jsonify({"error": "unknown seat id"}), 400

    expire_holds(conn)
    now = now_iso()
    expiry = (
        datetime.now(timezone.utc) + timedelta(seconds=HOLD_SECONDS)
    ).isoformat(timespec="seconds")

    placeholders = ",".join("?" * len(seat_ids))
    conn.execute(
        f"DELETE FROM holds WHERE user_name = ? AND date = ? AND time_slot = ? "
        f"AND seat_id NOT IN ({placeholders})",
        [user["username"], date_str, slot, *seat_ids],
    )
    for seat_id in seat_ids:
        conn.execute(
            """
            INSERT INTO holds (seat_id, date, time_slot, user_name, expires_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(seat_id, date, time_slot) DO UPDATE
               SET user_name = excluded.user_name, expires_at = excluded.expires_at
             WHERE holds.user_name = excluded.user_name
                OR holds.expires_at <= ?
            """,
            (seat_id, date_str, slot, user["username"], expiry, now),
        )
    mine = conn.execute(
        "SELECT seat_id, expires_at FROM holds "
        "WHERE user_name = ? AND date = ? AND time_slot = ?",
        (user["username"], date_str, slot),
    ).fetchall()
    conn.commit()
    conn.close()
    return jsonify(
        {
            "held": [m["seat_id"] for m in mine],
            "expires_at": mine[0]["expires_at"] if mine else None,
        }
    )


@app.get("/api/bookings")
def list_bookings():
    user = current_user()
    if user is None:
        return jsonify({"error": "log in required"}), 401
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT b.id, b.date, b.time_slot, b.user_name,
               s.label AS table_label, s.capacity,
               f.name AS floor_name,
               r.id AS restaurant_id, r.name AS restaurant_name
          FROM bookings b
          JOIN seats s ON s.id = b.seat_id
          JOIN floors f ON f.id = s.floor_id
          JOIN restaurants r ON r.id = f.restaurant_id
         WHERE b.user_name = ?
         ORDER BY b.date, b.time_slot, r.name, s.label
        """,
        (user["username"],),
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.delete("/api/bookings/<int:booking_id>")
def cancel_booking(booking_id):
    user = current_user()
    if user is None:
        return jsonify({"error": "log in required"}), 401
    conn = get_connection()
    cur = conn.execute(
        "DELETE FROM bookings WHERE id = ? AND user_name = ?",
        (booking_id, user["username"]),
    )
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return jsonify({"error": "booking not found"}), 404
    return "", 204


def require_admin():
    user = current_user()
    if user is None:
        return None, (jsonify({"error": "log in required"}), 401)
    if not user["is_admin"]:
        return None, (jsonify({"error": "admin only"}), 403)
    return user, None


def parse_admin_seat(body):
    label = body.get("label")
    if not isinstance(label, str) or not label.strip() or len(label) > 20:
        return None, (jsonify({"error": "label must be 1-20 characters"}), 400)
    out = {"label": label.strip()}
    for field, lo, hi in [("row", 1, 50), ("col", 1, 50), ("capacity", 1, 20)]:
        value = body.get(field)
        if not isinstance(value, int) or not lo <= value <= hi:
            return None, (jsonify({"error": f"{field} must be {lo}-{hi}"}), 400)
        out[field] = value
    return out, None


@app.post("/api/admin/restaurants/<int:restaurant_id>/floors")
def admin_add_floor(restaurant_id):
    _, err = require_admin()
    if err:
        return err
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON body required"}), 400
    name = str(body.get("name", "")).strip()
    if not name or len(name) > 30:
        return jsonify({"error": "name must be 1-30 characters"}), 400

    conn = get_connection()
    exists = conn.execute(
        "SELECT 1 FROM restaurants WHERE id = ?", (restaurant_id,)
    ).fetchone()
    if exists is None:
        conn.close()
        return jsonify({"error": "restaurant not found"}), 404
    cur = conn.execute(
        "INSERT INTO floors (restaurant_id, name) VALUES (?, ?)",
        (restaurant_id, name),
    )
    conn.commit()
    conn.close()
    return jsonify({"floor": {"id": cur.lastrowid, "name": name}}), 201


@app.post("/api/admin/floors/<int:floor_id>/seats")
def admin_add_seat(floor_id):
    _, err = require_admin()
    if err:
        return err
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON body required"}), 400
    fields, err = parse_admin_seat(body)
    if err:
        return err

    conn = get_connection()
    exists = conn.execute("SELECT 1 FROM floors WHERE id = ?", (floor_id,)).fetchone()
    if exists is None:
        conn.close()
        return jsonify({"error": "floor not found"}), 404
    dupe = conn.execute(
        "SELECT 1 FROM seats WHERE floor_id = ? AND row = ? AND col = ?",
        (floor_id, fields["row"], fields["col"]),
    ).fetchone()
    if dupe:
        conn.close()
        return jsonify({"error": "that grid position is already used"}), 400
    cur = conn.execute(
        "INSERT INTO seats (floor_id, label, row, col, capacity) "
        "VALUES (?, ?, ?, ?, ?)",
        (floor_id, fields["label"], fields["row"], fields["col"], fields["capacity"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"seat": {"id": cur.lastrowid, "floor_id": floor_id, **fields}}), 201


@app.patch("/api/admin/seats/<int:seat_id>")
def admin_update_seat(seat_id):
    _, err = require_admin()
    if err:
        return err
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or not body:
        return jsonify({"error": "JSON body with changes required"}), 400

    allowed = {"label", "row", "col", "capacity"}
    if not set(body) <= allowed:
        return jsonify({"error": "unknown field"}), 400

    conn = get_connection()
    existing = conn.execute(
        "SELECT floor_id, label, row, col, capacity FROM seats WHERE id = ?",
        (seat_id,),
    ).fetchone()
    if existing is None:
        conn.close()
        return jsonify({"error": "seat not found"}), 404
    merged = {**dict(existing), **body}
    fields, err = parse_admin_seat(merged)
    if err:
        return err

    dupe = conn.execute(
        "SELECT 1 FROM seats WHERE floor_id = ? AND row = ? AND col = ? AND id != ?",
        (existing["floor_id"], fields["row"], fields["col"], seat_id),
    ).fetchone()
    if dupe:
        conn.close()
        return jsonify({"error": "that grid position is already used"}), 400

    conn.execute(
        "UPDATE seats SET label = ?, row = ?, col = ?, capacity = ? WHERE id = ?",
        (fields["label"], fields["row"], fields["col"], fields["capacity"], seat_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"seat": {"id": seat_id, **fields}})


@app.delete("/api/admin/seats/<int:seat_id>")
def admin_delete_seat(seat_id):
    _, err = require_admin()
    if err:
        return err
    conn = get_connection()
    try:
        cur = conn.execute("DELETE FROM seats WHERE id = ?", (seat_id,))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.rollback()
        conn.close()
        return jsonify({"error": "seat has bookings or holds"}), 409
    conn.close()
    if cur.rowcount == 0:
        return jsonify({"error": "seat not found"}), 404
    return "", 204


@app.get("/")
def index():
    return send_from_directory(FRONTEND, "index.html")


@app.get("/<path:path>")
def frontend_file(path):
    return send_from_directory(FRONTEND, path)


if __name__ == "__main__":
    app.run(debug=True)
