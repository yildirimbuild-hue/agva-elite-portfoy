#!/usr/bin/env python3
import subprocess, sys
from pathlib import Path
script = Path(__file__).with_name("coord.py")
raise SystemExit(subprocess.call([sys.executable, str(script), "validate"]))
