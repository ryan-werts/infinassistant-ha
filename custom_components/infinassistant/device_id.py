"""Device identifier normalization shared by the config flow, webhook and services."""
import re

# MAC-shaped: 12 hex digits separated by single colons or hyphens, exactly 6 octets.
# Case-insensitive. Used to decide whether to strip separators.
_MAC_RE = re.compile(r"^[0-9a-f]{2}([:\-][0-9a-f]{2}){5}$", re.IGNORECASE)


def normalize_device_id(raw: str) -> str:
    """Canonicalize a user-supplied or zeroconf-advertised device ID.

    Returns the lowercased, whitespace-stripped form. If the trimmed value
    matches MAC-address shape (six colon- or hyphen-separated hex octets), the
    separators are also removed so ``AA:BB:cc:DD:EE:FF`` and ``aa-bb-cc-dd-ee-ff``
    both yield ``aabbccddeeff``. Returns an empty string when input is falsy.
    """
    if not raw:
        return ""
    trimmed = raw.strip()
    if _MAC_RE.match(trimmed):
        return trimmed.replace(":", "").replace("-", "").lower()
    return trimmed.lower()
