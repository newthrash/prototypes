"""
PromptGuard - AI Prompt Injection Scanner
FastAPI + HTMX Prototype
"""

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import re
from typing import List, Dict, Tuple
from dataclasses import dataclass
from enum import Enum
import os

app = FastAPI(title="PromptGuard", description="AI Prompt Injection Security Scanner")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Create templates directory if it doesn't exist
os.makedirs("templates", exist_ok=True)


class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Threat:
    type: str
    pattern: str
    risk: RiskLevel
    description: str
    mitigation: str


# Prompt Injection Attack Patterns
ATTACK_PATTERNS = [
    # Direct Injection
    Threat(
        type="Direct Instruction Override",
        pattern=r"ignore\s+(?:previous|all\s+)?\s*instructions",
        risk=RiskLevel.CRITICAL,
        description="Attempt to override system instructions",
        mitigation="Implement strict instruction hierarchy"
    ),
    Threat(
        type="Role Override",
        pattern=r"(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be)\s+(?:an?\s+)?\w+",
        risk=RiskLevel.HIGH,
        description="Attempt to change AI persona/role",
        mitigation="Lock role definition in system prompt"
    ),
    Threat(
        type="System Prompt Leak",
        pattern=r"(?:show|reveal|print|output)\s+(?:your|the)\s+(?:system\s+)?prompt",
        risk=RiskLevel.HIGH,
        description="Attempt to extract system instructions",
        mitigation="Never include system prompt in output"
    ),
    
    # Delimiter Attacks
    Threat(
        type="Delimiter Injection",
        pattern=r"[\<\[\{\(]\/?(?:system|user|assistant|instruction)[\>\]\}\)]",
        risk=RiskLevel.CRITICAL,
        description="Fake role delimiters to manipulate context",
        mitigation="Sanitize delimiter-like characters"
    ),
    Threat(
        type="Markdown Injection",
        pattern=r"```\s*(?:system|yaml|json)?\s*\n.*?```",
        risk=RiskLevel.MEDIUM,
        description="Code block injection to hide malicious content",
        mitigation="Parse and validate markdown content"
    ),
    
    # Context Manipulation
    Threat(
        type="Context Overflow",
        pattern=r".{5000,}",  # Very long input
        risk=RiskLevel.MEDIUM,
        description="Excessive input length to overflow context",
        mitigation="Implement input length limits"
    ),
    Threat(
        type="Token Smuggling",
        pattern=r"\b(?:base64|hex|rot13|encode|decode)\s*[:\(]",
        risk=RiskLevel.HIGH,
        description="Encoded/obfuscated malicious content",
        mitigation="Decode and scan nested content"
    ),
    
    # Social Engineering
    Threat(
        type="Authority Impersonation",
        pattern=r"(?:admin|administrator|developer|owner|creator)\s+(?:says|commands|requests)",
        risk=RiskLevel.HIGH,
        description="Impersonating authority figures",
        mitigation="Verify identity through authentication"
    ),
    Threat(
        type="Urgency Manipulation",
        pattern=r"(?:urgent|emergency|critical|immediate|asap)\s+(?:override|bypass|ignore)",
        risk=RiskLevel.MEDIUM,
        description="Using urgency to bypass safeguards",
        mitigation="Time-independent security checks"
    ),
    
    # External Resource Attacks
    Threat(
        type="URL Injection",
        pattern=r"https?://\S+(?:\.exe|\.sh|\.bat|\.py|\.js)",
        risk=RiskLevel.HIGH,
        description="Links to executable files",
        mitigation="URL allowlisting and content scanning"
    ),
    Threat(
        type="Data Exfiltration",
        pattern=r"(?:send|email|post|upload|transmit)\s+(?:to|at)\s+\S+@\S+",
        risk=RiskLevel.CRITICAL,
        description="Attempt to exfiltrate data",
        mitigation="Block external communication in prompts"
    ),
    
    # Jailbreak Patterns
    Threat(
        type="DAN Jailbreak",
        pattern=r"\b(?:dan|do\s+anything\s+now)\b",
        risk=RiskLevel.HIGH,
        description="Classic DAN jailbreak attempt",
        mitigation="Filter known jailbreak keywords"
    ),
    Threat(
        type="Hypothetical Framing",
        pattern=r"(?:hypothetically|imagine|pretend|what\s+if)\s+(?:you\s+could|there\s+were\s+no)\s+(?:rules|restrictions|limits)",
        risk=RiskLevel.MEDIUM,
        description="Using hypotheticals to bypass constraints",
        mitigation="Maintain consistent boundaries regardless of framing"
    ),
    
    # Multi-language/Encoding Attacks
    Threat(
        type="Unicode Homoglyphs",
        pattern=r"[а-яА-Я]",  # Cyrillic characters
        risk=RiskLevel.MEDIUM,
        description="Unicode homoglyph attack (lookalike characters)",
        mitigation="Normalize Unicode and detect mixed scripts"
    ),
    Threat(
        type="Zero-Width Characters",
        pattern=r"[\u200B-\u200D\uFEFF]",
        risk=RiskLevel.HIGH,
        description="Hidden zero-width characters",
        mitigation="Strip or flag zero-width characters"
    ),
]


def scan_prompt(prompt: str) -> Tuple[List[Threat], int, str]:
    """
    Scan a prompt for injection attacks.
    Returns: (detected_threats, risk_score, summary)
    """
    detected = []
    risk_score = 0
    
    for threat in ATTACK_PATTERNS:
        if re.search(threat.pattern, prompt, re.IGNORECASE | re.DOTALL):
            detected.append(threat)
            # Calculate risk score
            if threat.risk == RiskLevel.CRITICAL:
                risk_score += 100
            elif threat.risk == RiskLevel.HIGH:
                risk_score += 50
            elif threat.risk == RiskLevel.MEDIUM:
                risk_score += 25
            else:
                risk_score += 10
    
    # Cap at 100
    risk_score = min(risk_score, 100)
    
    # Generate summary
    if risk_score >= 80:
        summary = "CRITICAL: Multiple high-risk threats detected. Do not process this prompt."
    elif risk_score >= 50:
        summary = "HIGH RISK: Significant security concerns identified. Review carefully."
    elif risk_score >= 25:
        summary = "MEDIUM RISK: Some suspicious patterns detected. Proceed with caution."
    elif detected:
        summary = "LOW RISK: Minor issues found. Monitor for patterns."
    else:
        summary = "SAFE: No known attack patterns detected."
    
    return detected, risk_score, summary


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Main page with scanner interface"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/scan", response_class=HTMLResponse)
async def scan(
    request: Request,
    prompt: str = Form(...),
    context: str = Form("")
):
    """Scan a prompt for injection attacks"""
    # Combine context and prompt if context provided
    full_text = f"{context}\n{prompt}" if context else prompt
    
    detected, risk_score, summary = scan_prompt(full_text)
    
    return templates.TemplateResponse("results.html", {
        "request": request,
        "prompt": prompt,
        "context": context,
        "detected": detected,
        "risk_score": risk_score,
        "summary": summary,
        "risk_level": "critical" if risk_score >= 80 else "high" if risk_score >= 50 else "medium" if risk_score >= 25 else "low" if detected else "safe"
    })


@app.get("/api/scan")
async def api_scan(prompt: str, context: str = ""):
    """API endpoint for programmatic scanning"""
    full_text = f"{context}\n{prompt}" if context else prompt
    detected, risk_score, summary = scan_prompt(full_text)
    
    return {
        "prompt": prompt,
        "risk_score": risk_score,
        "risk_level": "critical" if risk_score >= 80 else "high" if risk_score >= 50 else "medium" if risk_score >= 25 else "low" if detected else "safe",
        "summary": summary,
        "threats": [
            {
                "type": t.type,
                "risk": t.risk.value,
                "description": t.description,
                "mitigation": t.mitigation
            }
            for t in detected
        ],
        "threat_count": len(detected)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
