import json, os, base64, datetime, sys
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

sa = json.loads(os.environ["GA4_SA_JSON"])
pid = os.environ["GA4_PROPERTY_ID"]
pw = os.environ["DASHBOARD_PASSWORD"].encode()

client = BetaAnalyticsDataClient.from_service_account_info(sa)
prop = f"properties/{pid}"

daily = client.run_report(RunReportRequest(
    property=prop,
    date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
    dimensions=[Dimension(name="date")],
    metrics=[Metric(name="activeUsers"), Metric(name="sessions"), Metric(name="screenPageViews")],
    order_bys=[{"dimension": {"dimension_name": "date"}}],
))
pages = client.run_report(RunReportRequest(
    property=prop,
    date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
    dimensions=[Dimension(name="pagePath")],
    metrics=[Metric(name="screenPageViews")],
    order_bys=[{"metric": {"metric_name": "screenPageViews"}, "desc": True}],
    limit=10,
))
sources = client.run_report(RunReportRequest(
    property=prop,
    date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
    dimensions=[Dimension(name="sessionSource")],
    metrics=[Metric(name="sessions")],
    order_bys=[{"metric": {"metric_name": "sessions"}, "desc": True}],
    limit=10,
))

def rows(rep):
    return [{"d": [v.value for v in r.dimension_values], "m": [float(v.value) for v in r.metric_values]} for r in rep.rows]

data = {
    "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "range": "30daysAgo..today",
    "daily": rows(daily),
    "pages": rows(pages),
    "sources": rows(sources),
}

salt = os.urandom(16)
iv = os.urandom(12)
kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=600000)
key = kdf.derive(pw)
ct = AESGCM(key).encrypt(iv, json.dumps(data).encode(), None)
out = {"v": 1, "salt": base64.b64encode(salt).decode(), "iv": base64.b64encode(iv).decode(), "ct": base64.b64encode(ct).decode()}
os.makedirs("data", exist_ok=True)
with open("data/analytics.json.enc", "w") as f:
    json.dump(out, f)
print("encrypted payload written,", len(ct), "bytes")
