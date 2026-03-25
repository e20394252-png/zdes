from datetime import datetime
import collections

DEBUG_LOGS = collections.deque(maxlen=100)

def debug_log(msg: str):
    ts = datetime.utcnow().strftime("%H:%M:%S")
    full_msg = f"[{ts}] {msg}"
    print(full_msg)
    DEBUG_LOGS.append(full_msg)
