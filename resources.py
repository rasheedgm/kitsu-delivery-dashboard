from flask import request
from flask.views import MethodView
from flask_jwt_extended import jwt_required

from zou.app.utils import permissions

from .models import get_or_create


class SettingsResource(MethodView):
    @jwt_required()
    def get(self):
        """
        Any authenticated user can read the current configuration (so
        everyone sees the same shot-status rule the studio has set).
        """
        return get_or_create().present()

    @jwt_required()
    def put(self):
        """
        Only studio admins/managers may change it — this affects every
        viewer's dashboard.
        """
        if not permissions.has_manager_permissions():  # admin or manager
            return {
                "error": True,
                "message": "You don't have the permission to change this.",
            }, 403

        data = request.get_json(silent=True) or {}
        settings = get_or_create()
        updates = {}

        if "shot_status_task_type_id" in data:
            value = data["shot_status_task_type_id"]
            updates["shot_status_task_type_id"] = str(value) if value else None

        if "delivered_status_ids" in data:
            value = data["delivered_status_ids"]
            updates["delivered_status_ids"] = (
                [str(v) for v in value] if isinstance(value, list) else []
            )

        if "retake_status_ids" in data:
            value = data["retake_status_ids"]
            updates["retake_status_ids"] = (
                [str(v) for v in value] if isinstance(value, list) else []
            )

        if updates:
            settings.update(updates)

        return settings.present()
