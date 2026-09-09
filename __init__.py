"""Delivery Dashboard plugin.

This plugin is frontend-only: it ships a Vue single-page app that reads Kitsu's
core REST API and computes every metric in the browser. It adds no API routes
and no database tables.
"""

# No backend routes. Kitsu still serves ``frontend/dist`` as static files at
# ``/api/plugins/delivery_dashboard/frontend/`` because the manifest enables a
# frontend section.
routes = []


def pre_install(manifest):
    """Nothing to do before install."""


def post_install(manifest):
    """Nothing to do after install."""


def pre_uninstall(manifest):
    """Nothing to do before uninstall."""


def post_uninstall(manifest):
    """Nothing to do after uninstall."""
