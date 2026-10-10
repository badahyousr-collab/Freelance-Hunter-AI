from dataclasses import dataclass

from app.sources.base import NormalizedProject


@dataclass(frozen=True)
class MatchProfile:
    skills: tuple[str, ...]
    languages: tuple[str, ...] = ("ru", "en")
    min_budget: float | None = None
    currency: str | None = None
    payment_preferences: tuple[str, ...] = ()
    excluded_keywords: tuple[str, ...] = ()


@dataclass(frozen=True)
class MatchResult:
    eligible: bool
    score: int
    reasons: tuple[str, ...]
    rejected_reason: str | None = None


def score_project(project: NormalizedProject, profile: MatchProfile) -> MatchResult:
    """Apply deterministic hard filters before optional AI ranking."""
    haystack = f"{project.title}\n{project.description}".casefold()
    for keyword in profile.excluded_keywords:
        if keyword.strip() and keyword.casefold() in haystack:
            return MatchResult(False, 0, (), f"Excluded keyword: {keyword}")
    if profile.languages and project.language and project.language.casefold() not in {x.casefold() for x in profile.languages}:
        return MatchResult(False, 0, (), "Language is outside profile preferences")
    if profile.min_budget is not None:
        if project.budget_max is None:
            return MatchResult(False, 0, (), "Budget is unknown")
        if profile.currency and project.currency and project.currency.upper() != profile.currency.upper():
            return MatchResult(False, 0, (), "Budget currency does not match profile")
        if project.budget_max < profile.min_budget:
            return MatchResult(False, 0, (), "Budget is below profile minimum")
    if profile.payment_preferences:
        if project.payment_method is None:
            return MatchResult(False, 0, (), "Payment method is unknown")
        if project.payment_method.casefold() not in {x.casefold() for x in profile.payment_preferences}:
            return MatchResult(False, 0, (), "Payment method is outside profile preferences")
    reasons: list[str] = []
    skill_hits = [skill for skill in profile.skills if skill.strip() and skill.casefold() in haystack]
    if skill_hits:
        reasons.append("Skill match: " + ", ".join(skill_hits[:8]))
    if project.language:
        reasons.append(f"Language: {project.language}")
    if project.budget_max is not None:
        reasons.append("Budget is listed")
    if project.payment_method:
        reasons.append(f"Payment method: {project.payment_method}")
    score = min(100, 45 + min(40, len(skill_hits) * 12) + (10 if project.budget_max is not None else 0) + (5 if project.language else 0))
    return MatchResult(True, score, tuple(reasons))
