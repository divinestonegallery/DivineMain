def normalize_email(value):
    if not value:
        return ''
    return value.strip().lower()


def normalize_phone(value):
    """Keep a leading plus and digits. Spaces and dashes are not part of the match key."""
    if not value:
        return ''
    raw = value.strip()
    leading_plus = raw.startswith('+')
    digits = ''.join(character for character in raw if character.isdigit())
    if not digits:
        return ''
    return f'+{digits}' if leading_plus else digits
