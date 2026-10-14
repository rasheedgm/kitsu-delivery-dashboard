"""add ignored_task_type_ids

Revision ID: 7d2c4a9e1b35
Revises: 51a458eecafa
Create Date: 2026-10-14 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '7d2c4a9e1b35'
down_revision = '51a458eecafa'
branch_labels = None
depends_on = None


def upgrade():
    # server_default so the existing settings row gets an empty list.
    op.add_column(
        'plugin_delivery_dashboard_settings',
        sa.Column(
            'ignored_task_type_ids',
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )


def downgrade():
    op.drop_column('plugin_delivery_dashboard_settings', 'ignored_task_type_ids')
