from sqlalchemy import and_, false, or_, select
from sqlalchemy.orm import Session

from app.models import Project, User, UserSource


def project_scope_conditions(db: Session, user: User):
    """Return SQL conditions restricting visible listings to the user's enabled sources."""
    subscriptions = db.scalars(
        select(UserSource).where(UserSource.user_id == user.id, UserSource.is_enabled.is_(True))
    ).all()
    conditions = []
    for item in subscriptions:
        if item.source == "telegram":
            conditions.append(
                and_(
                    Project.source == "telegram",
                    Project.source_project_id.startswith(item.identifier + ":", autoescape=True),
                )
            )
        else:
            conditions.append(Project.source == item.source)
    return or_(*conditions) if conditions else false()
