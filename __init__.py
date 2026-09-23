"""Delivery Dashboard plugin.

The Vue frontend reads Kitsu's core REST API and computes every dashboard
metric in the browser. The one backend piece is a tiny studio-wide settings
table (see models.py) — Kitsu's plugin system has no settings framework of
its own, so anything that needs to be shared across everyone's dashboard
(which task type represents a shot's status, which statuses mean
"delivered"/"retake") lives here instead of in each viewer's browser.
"""

from . import resources

routes = [
    ("/settings", resources.SettingsResource),
]


def pre_install(manifest):
    """Nothing to do before install."""


def post_install(manifest):
    """Nothing to do after install."""


def pre_uninstall(manifest):
    """Nothing to do before uninstall."""


def post_uninstall(manifest):
    """Nothing to do after uninstall."""
