"""Anonymous, opt-in LocateMe statistics.

The browser sends one small, rounded row only when the user clicks "Share". The row has
no code, no paths, no names and is not linked to any account. Rows are never returned one
by one: the public endpoint only exposes aggregates, and only once enough suites exist.
"""
import hashlib
import json
import os
import statistics
from datetime import datetime, timezone
from typing import Literal, Optional, Union

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy.orm import Session

from core.db import get_db
from core.models.locate_stat import LocateStat
from core.rate_limit import limiter, client_ip

router = APIRouter()

# Below this many shared suites nothing but the count is published.
# Production keeps the default 10 (the UI texts promise it); staging may lower it.
MIN_SUITES = max(1, int(os.getenv("STATS_MIN_SUITES", "10")))

SIZE_BOUNDS = {
    "50-99": (50, 99), "100-249": (100, 249), "250-499": (250, 499), "500-999": (500, 999),
    "1000-2499": (1000, 2499), "2500-4999": (2500, 4999), "5000-9999": (5000, 9999),
    "10000+": (10000, 10_000_000),
}
SUB_BY_KIND = {
    "fragile": {
        "chain-positional", "css-autoclass", "css-id-generated", "css-positional",
        "css-structural-depth", "css-utility", "selenium-id-generated", "text-loose",
        "xpath-absolute", "xpath-axis", "xpath-id-generated", "xpath-positional",
    },
    "context": {
        "chain-positional-edge", "css-class", "css-data-unknown", "method-text",
        "selenium-classname", "selenium-linktext", "selenium-partiallinktext",
        "selenium-tagname", "xpath-attr", "xpath-data-unknown", "xpath-text",
    },
    "stable": {
        "css-id", "css-testattr", "cy-alias", "method-stable", "selenium-id",
        "selenium-name", "xpath-id", "xpath-testattr",
    },
}
ALL_SUBS = set().union(*SUB_BY_KIND.values())
# Fragile sub-causes grouped into the two habits the public study found.
# Same grouping as the public study: XPath positions count under XPath, not position.
POSITION_SUBS = {"chain-positional", "css-positional"}
TEXT_SUBS = {"text-loose"}
XPATH_SUBS = {"xpath-absolute", "xpath-axis", "xpath-id-generated", "xpath-positional"}

Rounded = Union[int, Literal["<5"]]


def _num(v: Rounded) -> float:
    """Numeric value of a rounded count. "<5" (1-4) counts as 2.5."""
    return 2.5 if v == "<5" else float(v)


def _valid_rounded(v: Rounded) -> bool:
    if v == "<5":
        return True
    if not isinstance(v, int) or isinstance(v, bool) or v < 0:
        return False
    if v == 0:
        return True
    if v < 100:
        return v % 5 == 0 and v >= 5
    # 100+ keeps two significant digits.
    digits = len(str(v))
    return v % (10 ** (digits - 2)) == 0


class Kinds(BaseModel):
    model_config = ConfigDict(extra="forbid")
    fragile: Rounded
    stable: Rounded
    context: Rounded
    dynamic: Rounded


class StatIn(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    # "schema" would shadow a BaseModel attribute, so the field is aliased.
    schema_version: Literal[1] = Field(alias="schema")
    rules: Literal["2026-11"]
    framework: Literal["Playwright", "Cypress", "Selenium"]
    size: Literal["50-99", "100-249", "250-499", "500-999", "1000-2499", "2500-4999", "5000-9999", "10000+"]
    age: Optional[Literal["<1y", "1-3y", "3-5y", "5y+"]] = None
    kinds: Kinds
    sub: dict[str, Rounded]

    @field_validator("sub")
    @classmethod
    def sub_whitelist(cls, v: dict) -> dict:
        unknown = set(v) - ALL_SUBS
        if unknown:
            raise ValueError("unknown sub-cause")
        for val in v.values():
            if not _valid_rounded(val) or val == 0:
                raise ValueError("bad sub-cause count")
        return v

    @model_validator(mode="after")
    def consistent(self):
        kinds = self.kinds.model_dump()
        for val in kinds.values():
            if not _valid_rounded(val):
                raise ValueError("bad count")
        total = sum(_num(v) for v in kinds.values())
        lo, hi = SIZE_BOUNDS[self.size]
        # Rounding moves each of the 4 counts by at most ~5% or 2.5; allow that slack.
        if not (lo * 0.85 - 10 <= total <= hi * 1.15 + 10):
            raise ValueError("counts don't match size")
        for kind, subs in SUB_BY_KIND.items():
            in_kind = sum(_num(v) for k, v in self.sub.items() if k in subs)
            limit = _num(kinds[kind]) * 1.15 + 2.5 * len(subs)
            if in_kind > limit:
                raise ValueError("sub-causes exceed their class")
        return self


@router.post("/locate/stats")
@limiter.limit("20/hour", key_func=client_ip)
async def share_stat(request: Request, body: StatIn, db: Session = Depends(get_db)):
    row = body.model_dump(by_alias=True)
    canonical = json.dumps(row, sort_keys=True, separators=(",", ":"))
    fingerprint = hashlib.sha256(canonical.encode()).hexdigest()
    # Identical rows are almost surely the same suite shared twice: keep one.
    if db.query(LocateStat.id).filter(LocateStat.fingerprint == fingerprint).first():
        return {"ok": True, "duplicate": True}
    kinds = row["kinds"]
    total = sum(_num(v) for v in kinds.values()) or 1.0
    db.add(LocateStat(
        month=datetime.now(timezone.utc).strftime("%Y-%m"),
        schema=row["schema"],
        rules=row["rules"],
        framework=row["framework"],
        size=row["size"],
        age=row["age"],
        kinds=json.dumps(kinds),
        sub=json.dumps(row["sub"]),
        fragile_share=_num(kinds["fragile"]) / total,
        fingerprint=fingerprint,
    ))
    db.commit()
    return {"ok": True, "duplicate": False}


def _summary(rows: list[LocateStat]) -> dict:
    shares = [r.fragile_share for r in rows]
    fragile_total = position = text = xpath = 0.0
    pooled_fragile = pooled_all = 0.0
    for r in rows:
        kinds = json.loads(r.kinds)
        pooled_fragile += _num(kinds["fragile"])
        pooled_all += sum(_num(v) for v in kinds.values())
        sub = json.loads(r.sub)
        for k, v in sub.items():
            if k not in SUB_BY_KIND["fragile"]:
                continue
            n = _num(v)
            fragile_total += n
            if k in POSITION_SUBS:
                position += n
            if k in TEXT_SUBS:
                text += n
            if k in XPATH_SUBS:
                xpath += n
    pct = (lambda x: round(100 * x / fragile_total, 1)) if fragile_total else (lambda x: None)
    return {
        "suites": len(rows),
        "median_fragile_pct": round(100 * statistics.median(shares), 1),
        "pooled_fragile_pct": round(100 * pooled_fragile / pooled_all, 1) if pooled_all else None,
        "no_fragile_pct": round(100 * sum(1 for s in shares if s == 0) / len(shares)),
        "position_pct": pct(position),
        "text_pct": pct(text),
        "xpath_pct": pct(xpath),
    }


@router.get("/locate/stats/summary")
@limiter.limit("60/minute", key_func=client_ip)
async def stats_summary(request: Request, db: Session = Depends(get_db)):
    rows = db.query(LocateStat).all()
    out: dict = {"suites": len(rows), "min_suites": MIN_SUITES, "overall": None, "by_framework": [], "by_age": []}
    if len(rows) < MIN_SUITES:
        return out
    out["overall"] = _summary(rows)
    for fw in ("Playwright", "Cypress", "Selenium"):
        group = [r for r in rows if r.framework == fw]
        if len(group) >= MIN_SUITES:
            out["by_framework"].append({"framework": fw, **_summary(group)})
    for age in ("<1y", "1-3y", "3-5y", "5y+"):
        group = [r for r in rows if r.age == age]
        if len(group) >= MIN_SUITES:
            out["by_age"].append({"age": age, **_summary(group)})
    return out
