#!/usr/bin/env python3
"""Phase gate checks, run against a live stack over HTTP.

    docker compose up -d
    python scripts/verify_gates.py

Every phase in this build has an exit gate stated in the brief. These assert
those gates end to end, through the API rather than through the service layer,
because that is the boundary a future caller actually crosses.

Self-seeding: each run creates its own project and target, so the script is
idempotent and never depends on state a previous run left behind. It costs a
handful of UniProt and AlphaFold requests.

Exits non-zero on the first failure.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

BASE = "http://localhost:8000"
ACCESSION = "P37957"  # B. subtilis lipase A: a 31-residue signal peptide, so the
# full-length and mature schemes genuinely disagree.

failures = 0


def call(method: str, path: str, body: object | None = None) -> tuple[int, object]:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.status, json.loads(response.read() or "null")
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read() or "null")


def step(label: str, ok: bool, detail: str = "") -> None:
    global failures
    if not ok:
        failures += 1
    mark = "PASS" if ok else "FAIL"
    suffix = f"  {detail}" if detail else ""
    print(f"  [{mark}] {label}{suffix}")


def section(title: str) -> None:
    print(f"\n{title}")


def main() -> int:
    for attempt in range(30):
        try:
            status, _ = call("GET", "/health")
            if status == 200:
                break
        except OSError:
            pass
        if attempt == 29:
            print("API is not reachable. Start it with `docker compose up -d`.")
            return 2
        time.sleep(1)

    stamp = int(time.time())

    section("Setup: a fresh project and target")
    status, project = call(
        "POST",
        "/projects",
        {"name": f"Gate check {stamp}", "organism": "Bacillus subtilis"},
    )
    step("project created", status == 201)
    project_id = project["id"]

    status, target = call(
        "POST", f"/projects/{project_id}/targets", {"source": "uniprot", "accession": ACCESSION}
    )
    step("target loaded from UniProt", status == 201, f"{target['name']}, {target['length']} aa")
    target_id = target["id"]

    section("Phase 2: numbering is unambiguous or refused")
    step("not designable before reconciliation", target["is_designable"] is False)
    step("candidate schemes offered, none canonical",
         len(target["numbering_schemes"]) == 2
         and not any(s["is_canonical"] for s in target["numbering_schemes"]))

    status, target = call("POST", f"/targets/{target_id}/structures", {"source": "alphafold_db"})
    step("AlphaFold structure attached", status == 201)
    structure = target["structures"][0]
    step("labelled predicted, not experimental", structure["is_predicted"] is True)

    status, recon = call(
        "POST", f"/targets/{target_id}/reconcile", {"structure_id": structure["id"]}
    )
    step("prediction reconciles exactly",
         recon["outcome"] == "reconciled" and recon["method"] == "exact",
         f"coverage {recon['coverage']:.0%}")

    status, _ = call("GET", f"/targets/{target_id}/mutation/A123V")
    step("mutation codes refused before a canonical scheme", status == 409)

    call("POST", f"/targets/{target_id}/reconcile/accept", {"structure_id": structure["id"]})
    status, target = call("GET", f"/targets/{target_id}")
    step("saving a scheme is not confirming one", target["is_designable"] is False)

    mature = next(s for s in target["numbering_schemes"] if s["kind"] == "construct")
    status, target = call(
        "POST", f"/targets/{target_id}/numbering/confirm", {"scheme_id": mature["id"]}
    )
    step("canonical confirmed", target["is_designable"] is True,
         target["canonical_scheme_label"])

    status, rendered = call("GET", f"/targets/{target_id}/mutation/A123V")
    step("mutation code carries its scheme", status == 200
         and rendered["scheme_label"] == target["canonical_scheme_label"],
         rendered.get("rendered", ""))

    section("Phase 3: no run starts from an unconfirmed parse")
    status, goal = call(
        "POST",
        f"/targets/{target_id}/goals",
        {"text": "make this enzyme survive 65 C without killing activity, "
                 "one 96-well plate in E. coli, measured by DSF"},
    )
    step("goal parsed", status == 201, f"method={goal['method']}")
    spec = goal["spec"]
    step("objective read", spec["objective"] == "thermostability")
    step("stated target kept in its own unit",
         spec["target_value"] == {"value": 65, "unit": "°C"})
    step("budget read", spec["budget"]["variants"] == 96)

    _, pre = call("GET", f"/goals/{goal['id']}/preflight")
    step("preflight refuses an unconfirmed parse", pre["can_start"] is False)

    status, vague = call(
        "POST", f"/targets/{target_id}/goals", {"text": "do something clever with this protein"}
    )
    step("no objective invented", vague["spec"]["objective"] is None)
    status, _ = call("POST", f"/goals/{vague['id']}/confirm")
    step("an incomplete objective cannot be confirmed", status == 400)

    status, confirmed = call("POST", f"/goals/{goal['id']}/confirm")
    step("confirming unlocks the run", status == 200 and confirmed["is_confirmed"] is True)
    _, pre = call("GET", f"/goals/{goal['id']}/preflight")
    step("preflight allows", pre["can_start"] is True)

    edited = dict(spec)
    edited["target_value"] = {"value": 70, "unit": "°C"}
    status, after = call("POST", f"/goals/{goal['id']}", {"spec": edited})
    step("editing a chip clears the confirmation", after["is_confirmed"] is False)

    combined = " ".join(after["expectations"]["will_not"]).lower()
    step("states it will not predict a Tm shift", "melting temperature" in combined)
    step("states stacking is assumed additive", "additive" in combined)

    section("Phase 3: constraints are translated and never auto-applied")
    _, before = call("GET", f"/targets/{target_id}/constraints")
    status, suggestions = call("GET", f"/targets/{target_id}/constraints/suggestions")
    step("suggestions returned", status == 200 and len(suggestions) > 0,
         f"{len(suggestions)} from UniProt")
    _, unchanged = call("GET", f"/targets/{target_id}/constraints")
    step("fetching suggestions applied nothing", len(unchanged) == len(before))

    catalytic = [s for s in suggestions if s["kind"] == "catalytic"]
    step("catalytic residues suggested", len(catalytic) > 0)
    if catalytic:
        # The point of the whole numbering subsystem: UniProt annotates the
        # nucleophile at 108; under mature numbering it is residue 77.
        note = catalytic[0]["note"]
        step("position translated out of UniProt numbering",
             "108" in note and "77" in note, note[:100])

    status, created = call(
        "POST",
        f"/targets/{target_id}/constraints",
        {"kind": catalytic[0]["kind"], "positions": catalytic[0]["positions"]},
    )
    step("accepted on request", status == 201)
    step("labelled in the canonical scheme", created["labels"] == catalytic[0]["labels"],
         ", ".join(created["labels"]))

    status, _ = call(
        "POST", f"/targets/{target_id}/constraints", {"kind": "catalytic", "positions": [99999]}
    )
    step("out-of-range positions refused", status == 400)

    print()
    if failures:
        print(f"{failures} gate check(s) FAILED.")
        return 1
    print("All phase gate checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
