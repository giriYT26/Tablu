PRAGMA foreign_keys = ON;

CREATE TABLE restaurants (
    id        INTEGER PRIMARY KEY,
    name      TEXT    NOT NULL,
    category  TEXT    NOT NULL DEFAULT 'non-veg',
    latitude  REAL    NOT NULL,
    longitude REAL    NOT NULL,
    image     TEXT
);

CREATE TABLE floors (
    id            INTEGER PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    name          TEXT    NOT NULL
);

CREATE TABLE seats (
    id       INTEGER PRIMARY KEY,
    floor_id INTEGER NOT NULL REFERENCES floors(id),
    label    TEXT    NOT NULL,
    row      INTEGER NOT NULL,
    col      INTEGER NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE bookings (
    id        INTEGER PRIMARY KEY,
    seat_id   INTEGER NOT NULL REFERENCES seats(id),
    date      TEXT    NOT NULL,
    time_slot TEXT    NOT NULL,
    user_name TEXT    NOT NULL DEFAULT 'guest',
    UNIQUE (seat_id, date, time_slot)
);

CREATE TABLE users (
    id            INTEGER PRIMARY KEY,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    is_admin      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE holds (
    id         INTEGER PRIMARY KEY,
    seat_id    INTEGER NOT NULL REFERENCES seats(id),
    date       TEXT    NOT NULL,
    time_slot  TEXT    NOT NULL,
    user_name  TEXT    NOT NULL,
    expires_at TEXT    NOT NULL,
    UNIQUE (seat_id, date, time_slot)
);
