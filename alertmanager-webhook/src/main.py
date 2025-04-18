from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
from hawkeye import Hawkeye
import os

hawkeye_user = os.getenv("HAWKEYE_USER")
hawkeye_password = os.getenv("HAWKEYE_PASSWORD")
hawkeye_url = os.getenv("HAWKEYE_URL")
hawkeye_project = os.getenv("HAWKEYE_PROJECT")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI()

class Alert(BaseModel):
    status: str
    labels: Dict[str, str]
    annotations: Optional[Dict[str, str]] = {}
    startsAt: str
    endsAt: str
    generatorURL: str

class AlertPayload(BaseModel):
    receiver: str
    status: str
    alerts: List[Alert]
    groupLabels: Dict[str, str]
    commonLabels: Dict[str, str]
    commonAnnotations: Dict[str, str]
    externalURL: str
    version: str
    groupKey: str
    truncatedAlerts: Optional[int] = 0

@app.post("/alert")
async def alert_receiver(payload: AlertPayload):
    
    payload_dict = payload.dict()
    for alert in payload_dict.get("alerts", []):
        if str(alert.get("status")) == "firing":
            alert_name = str(alert.get("labels", {}).get("alertname"))
            description = alert.get("annotations", {}).get("description")
            prompt = f"{alert_name} - {description}. Investigate from last 1 hour. Please provide a detailed report."
            hawkeye = Hawkeye(hawkeye_project, hawkeye_url, hawkeye_user, hawkeye_password)
            hawkeye.send_prompt(prompt)