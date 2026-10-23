import importlib
import unittest
from datetime import datetime, timedelta, timezone
from typing import get_args
from unittest.mock import patch
from uuid import uuid4

from pydantic import ValidationError


models = importlib.import_module("services.api-incidents.models")
Incident = models.Incident


class IncidentTests(unittest.TestCase):
    def make_incident(self, **overrides):
        return Incident(**{
            "title": "Fallo de horno",
            "description": "El horno no enciende.",
            "category": "equipment_failure",
            "origin": "internal",
            **overrides,
        })

    def test_automatic_fields(self):
        before = datetime.now(timezone.utc)
        incident = self.make_incident()
        after = datetime.now(timezone.utc)
        self.assertEqual(incident.id.version, 4)
        self.assertNotEqual(incident.id, self.make_incident().id)
        self.assertLessEqual(before, incident.created_at)
        self.assertLessEqual(incident.created_at, after)
        self.assertEqual(incident.created_at, incident.updated_at)
        self.assertEqual(incident.created_at.tzinfo, timezone.utc)
        self.assertEqual(incident.status, "open")
        self.assertEqual(incident.branch, "central")

    def test_required_fields(self):
        data = self.make_incident().model_dump()
        for field in ("title", "description", "category", "origin"):
            with self.subTest(field=field), self.assertRaises(ValidationError):
                Incident(**{key: value for key, value in data.items() if key != field})

    def test_empty_and_non_string_text_rejected(self):
        for field in ("title", "description"):
            for value in ("", " \t\n", None, 123):
                with self.subTest(field=field, value=value):
                    with self.assertRaises(ValidationError):
                        self.make_incident(**{field: value})

    def test_all_allowed_values(self):
        for field, literal in (
            ("category", models.IncidentCategory),
            ("status", models.IncidentStatus),
            ("origin", models.IncidentOrigin),
            ("branch", models.IncidentBranch),
        ):
            for value in get_args(literal):
                with self.subTest(field=field, value=value):
                    values = {"branch": "miami_doral", field: value}
                    incident = self.make_incident(**values)
                    self.assertEqual(getattr(incident, field), value)

    def test_invalid_values_and_nulls_rejected(self):
        for field in Incident.model_fields:
            values = (None,) if field in ("title", "description") else (None, "invalid")
            for value in values:
                with self.subTest(field=field, value=value):
                    with self.assertRaises(ValidationError):
                        self.make_incident(**{field: value})

    def test_unknown_fields_rejected(self):
        with self.assertRaises(ValidationError):
            self.make_incident(priority="high")

    def test_branch_origin_requires_specific_branch(self):
        with self.assertRaises(ValidationError):
            self.make_incident(origin="branch")
        for origin in ("customer", "internal"):
            self.assertEqual(self.make_incident(origin=origin).branch, "central")

    def test_dates_must_be_aware_and_chronological(self):
        for field in ("created_at", "updated_at"):
            with self.subTest(field=field), self.assertRaises(ValidationError):
                self.make_incident(**{field: datetime(2026, 1, 1)})
        created = datetime(2026, 1, 1, tzinfo=timezone.utc)
        with self.assertRaises(ValidationError):
            self.make_incident(
                created_at=created, updated_at=created - timedelta(seconds=1)
            )

    def test_historical_dates_and_json_round_trip(self):
        created = datetime(2025, 1, 1, tzinfo=timezone(timedelta(hours=-5)))
        incident = self.make_incident(created_at=created, status="resolved")
        self.assertEqual(incident.created_at.hour, 5)
        self.assertEqual(incident.created_at.tzinfo, timezone.utc)
        self.assertEqual(incident.created_at, incident.updated_at)
        self.assertEqual(Incident.model_validate_json(incident.model_dump_json()), incident)

    def test_update_preserves_identity_and_refreshes_timestamp(self):
        created = datetime(2025, 1, 1, tzinfo=timezone.utc)
        now = datetime(2026, 1, 1, tzinfo=timezone.utc)
        incident = self.make_incident(created_at=created)
        with patch.object(models, "datetime") as clock:
            clock.now.return_value = now
            updated = incident.update(title="Horno revisado", status="in_progress")
        self.assertEqual(updated.id, incident.id)
        self.assertEqual(updated.created_at, incident.created_at)
        self.assertEqual(updated.updated_at, now)
        self.assertEqual(updated.title, "Horno revisado")
        self.assertEqual(updated.status, "in_progress")
        self.assertEqual(incident.updated_at, created)
        self.assertEqual(incident.status, "open")

    def test_update_revalidates_and_protects_automatic_fields(self):
        for changes in (
            {"title": " "}, {"category": "invalid"}, {"origin": "branch"},
            {"id": uuid4()}, {"created_at": datetime.now(timezone.utc)},
            {"updated_at": datetime.now(timezone.utc)}, {"unknown": True},
        ):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.make_incident().update(**changes)
        incident = self.make_incident()
        with self.assertRaises(ValidationError):
            incident.title = "Otro titulo"

    def test_all_status_transitions(self):
        allowed = {
            ("open", "in_progress"), ("open", "discarded"),
            ("in_progress", "resolved"), ("in_progress", "discarded"),
        }
        for source in get_args(models.IncidentStatus):
            for target in get_args(models.IncidentStatus):
                with self.subTest(source=source, target=target):
                    incident = self.make_incident(status=source)
                    if source == target or (source, target) in allowed:
                        self.assertEqual(incident.update(status=target).status, target)
                    else:
                        with self.assertRaises(ValueError):
                            incident.update(status=target)


if __name__ == "__main__":
    unittest.main()
