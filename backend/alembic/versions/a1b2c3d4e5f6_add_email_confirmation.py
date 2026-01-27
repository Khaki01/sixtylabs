"""Add email confirmation

Revision ID: a1b2c3d4e5f6
Revises: 96f159ad243e
Create Date: 2025-01-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '96f159ad243e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email confirmation columns to users table
    op.add_column('users', sa.Column('email_confirmed', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('users', sa.Column('email_confirmed_at', sa.DateTime(timezone=True), nullable=True))

    # Update existing users to have email_confirmed=True (already verified through old flow)
    op.execute("UPDATE users SET email_confirmed = true WHERE email_confirmed IS NULL")

    # Create email_tokens table
    op.create_table(
        'email_tokens',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('token', sa.String(64), unique=True, index=True, nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_type', sa.String(20), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('email_tokens')
    op.drop_column('users', 'email_confirmed_at')
    op.drop_column('users', 'email_confirmed')
