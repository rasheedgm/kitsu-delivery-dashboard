"""Studio-wide settings for the Delivery Dashboard.

A single row holds every studio: which task type represents a shot's overall
status, and which task statuses count as "delivered" / "retake" for the
shot-level metrics. Kitsu's plugin system has no settings framework of its
own (see README) so this plugin carries its own tiny table for it.
"""

from zou.app import db
from zou.app.models.base import BaseMixin
from zou.app.models.serializer import SerializerMixin
from zou.app.utils import fields


class Settings(db.Model, BaseMixin, SerializerMixin):
    __tablename__ = "plugin_delivery_dashboard_settings"

    # Task type whose task represents a shot's overall status (e.g. "Client
    # Delivery"). Stored as plain text, not a FK, so this plugin never
    # constrains or cascades against Zou's own task_type table.
    shot_status_task_type_id = db.Column(db.String(36), nullable=True)

    # Task-status ids the studio has explicitly chosen to mean "delivered" /
    # "retake" for shot-level metrics. Empty by default — the dashboard falls
    # back to Kitsu's own status flags (is_done / is_retake) until a studio
    # configures this.
    delivered_status_ids = db.Column(db.JSON, nullable=False, default=list)
    retake_status_ids = db.Column(db.JSON, nullable=False, default=list)

    def present(self):
        return {
            "id": str(self.id),
            "shot_status_task_type_id": self.shot_status_task_type_id,
            "delivered_status_ids": self.delivered_status_ids or [],
            "retake_status_ids": self.retake_status_ids or [],
            "updated_at": fields.serialize_datetime(self.updated_at),
        }


def get_or_create():
    """Singleton settings row — this plugin has exactly one config per studio."""
    row = Settings.query.first()
    if row is None:
        row = Settings.create(
            shot_status_task_type_id=None,
            delivered_status_ids=[],
            retake_status_ids=[],
        )
    return row
