"""Constants for the InfinAssistant integration."""

DOMAIN = "infinassistant"

# Entity types
CONF_DEVICE_ID = "device_id"
CONF_WEBHOOK_ID = "webhook_id"

# Sensor types
SENSOR_TYPES = {
    "steps": {"name": "Steps", "unit": "steps", "icon": "mdi:shoe-print"},
    "heart_rate": {"name": "Heart Rate", "unit": "bpm", "icon": "mdi:heart-pulse"},
    "battery": {"name": "Battery", "unit": "%", "icon": "mdi:battery"},
    "motion_state": {"name": "Motion State", "unit": None, "icon": "mdi:motion-sensor"},
    "heart_rate_state": {"name": "Heart Rate State", "unit": None, "icon": "mdi:heart-flash"},
}

# Binary sensor types
BINARY_SENSOR_TYPES = {
    "battery_charging": {"name": "Battery Charging", "device_class": "battery_charging"},
    "connected": {"name": "Connected", "device_class": "connectivity"},
}

# Webhook
WEBHOOK_PATH = "/api/webhook/{webhook_id}"

# ── Security: HMAC signing ────────────────────────────────────────────────────
CONF_HMAC_SECRET = "hmac_secret"
CONF_HMAC_OLD_SECRET = "hmac_old_secret"
CONF_HMAC_ROTATION_TIME = "hmac_rotation_time"
CONF_REPLAY_WINDOW = "replay_window"

# Grace period after key rotation during which both old and new keys are accepted
HMAC_GRACE_PERIOD = 3600  # 60 minutes in seconds
# Issue persistent_notification this many seconds before grace period expires
HMAC_EXPIRY_WARNING = 600  # 10 minutes in seconds
# Default replay window for timestamp validation
DEFAULT_REPLAY_WINDOW = 30  # seconds

# ── Security: Rate limiting ───────────────────────────────────────────────────
CONF_RATE_LIMIT = "rate_limit"
DEFAULT_RATE_LIMIT = 60  # requests per minute
RATE_LIMIT_BURST = 5  # extra tokens allowed on empty bucket (Doze-wake burst)

# ── Security: Sensor data range validation ────────────────────────────────────
SENSOR_RANGES = {
    "heart_rate": (15, 260),       # bpm
    "battery_percent": (0, 100),   # %
    "steps": (0, 500_000),         # steps
}

# A numeric value that means "no reading" rather than a measurement. The watch
# reports a heart rate of 0 when it has no sample. The value becomes unknown
# (None) quietly: no warning and no range-violation count.
SENSOR_NO_READING = {
    "heart_rate": 0,
}

# Webhook sensor keys whose value is a short text state rather than a number.
# Every other key stays numeric-only. The app sends motion_state as
# "active"/"inactive" and heart_rate_state as "stopped"/"not_enough_data"/
# "no_touch"/"running"/"unknown".
TEXT_SENSOR_KEYS = frozenset({"motion_state", "heart_rate_state"})
MAX_TEXT_SENSOR_LEN = 32

# ── Security: HMAC failure alerting ──────────────────────────────────────────
HMAC_FAILURE_ALERT_THRESHOLD = 10  # failures within window before persistent_notification
HMAC_FAILURE_WINDOW = 3600         # window size in seconds (1 hour)

# ── Coordinator / options flow ────────────────────────────────────────────────
CONF_UPDATE_INTERVAL = "update_interval"
DEFAULT_UPDATE_INTERVAL = 300      # seconds (5 minutes)
MIN_UPDATE_INTERVAL = 60
MAX_UPDATE_INTERVAL = 3600

CONF_CONNECTED_THRESHOLD = "connected_threshold"
DEFAULT_CONNECTED_THRESHOLD = 120  # seconds
MIN_CONNECTED_THRESHOLD = 30
MAX_CONNECTED_THRESHOLD = 600

# Per-sensor enable/disable toggles stored in options
CONF_SENSOR_ENABLED_PREFIX = "sensor_enabled_"  # key = prefix + sensor_type
