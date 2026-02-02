"""
MedFlow - Healthcare AI Agent Workflow Builder
FastAPI + HTMX Prototype

A visual workflow builder for creating HIPAA-compliant healthcare AI agents.
"""

from fastapi import FastAPI, Form, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from enum import Enum
from datetime import datetime
import json
import uuid
import os

app = FastAPI(
    title="MedFlow",
    description="Healthcare AI Agent Workflow Builder",
    version="0.1.0"
)

# Setup templates
templates = Jinja2Templates(directory="templates")
os.makedirs("templates", exist_ok=True)


# ==================== DATA MODELS ====================

class NodeType(str, Enum):
    TRIGGER = "trigger"
    DATA_INPUT = "data_input"
    AI_PROCESS = "ai_process"
    DECISION = "decision"
    ACTION = "action"
    AUDIT_LOG = "audit_log"
    OUTPUT = "output"


class WorkflowNode(BaseModel):
    id: str
    type: NodeType
    label: str
    position: Dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0})
    config: Dict[str, Any] = Field(default_factory=dict)
    connections: List[str] = Field(default_factory=list)


class Workflow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    nodes: List[WorkflowNode] = Field(default_factory=list)
    is_active: bool = False
    hipaa_compliant: bool = True
    audit_enabled: bool = True


class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    action: str
    user: str
    data_accessed: List[str]
    phi_detected: bool
    ip_address: str
    user_agent: str


# ==================== NODE TEMPLATES ====================

NODE_TEMPLATES = {
    NodeType.TRIGGER: {
        "name": "Workflow Trigger",
        "description": "Start the workflow",
        "icon": "⚡",
        "color": "#f59e0b",
        "config_fields": [
            {"name": "trigger_type", "type": "select", "options": ["scheduled", "webhook", "manual", "file_upload"], "label": "Trigger Type"},
            {"name": "schedule", "type": "text", "label": "Schedule (cron)", "condition": "trigger_type=scheduled"},
            {"name": "webhook_endpoint", "type": "text", "label": "Webhook Endpoint", "condition": "trigger_type=webhook"}
        ]
    },
    NodeType.DATA_INPUT: {
        "name": "Data Input",
        "description": "Collect or import patient data",
        "icon": "📥",
        "color": "#3b82f6",
        "config_fields": [
            {"name": "data_source", "type": "select", "options": ["ehr_api", "file_upload", "form", "hl7_message"], "label": "Data Source"},
            {"name": "required_fields", "type": "multiselect", "options": ["patient_id", "name", "dob", "medical_record_number", "diagnosis_codes"], "label": "Required Fields"},
            {"name": "phi_masking", "type": "boolean", "label": "Enable PHI Masking", "default": True}
        ]
    },
    NodeType.AI_PROCESS: {
        "name": "AI Processing",
        "description": "Process data with AI",
        "icon": "🧠",
        "color": "#8b5cf6",
        "config_fields": [
            {"name": "task_type", "type": "select", "options": ["clinical_summarization", "coding_extraction", "prior_auth_check", "trial_matching", "documentation"], "label": "AI Task"},
            {"name": "model", "type": "select", "options": ["gpt-4", "claude-3", "med-palm", "local-llm"], "label": "AI Model"},
            {"name": "temperature", "type": "number", "label": "Temperature", "min": 0, "max": 1, "step": 0.1, "default": 0.3},
            {"name": "max_tokens", "type": "number", "label": "Max Tokens", "min": 100, "max": 8000, "default": 2000}
        ]
    },
    NodeType.DECISION: {
        "name": "Decision",
        "description": "Conditional logic branching",
        "icon": "🔀",
        "color": "#10b981",
        "config_fields": [
            {"name": "condition_type", "type": "select", "options": ["if_else", "switch", "score_threshold"], "label": "Condition Type"},
            {"name": "condition", "type": "text", "label": "Condition Expression"},
            {"name": "true_branch", "type": "text", "label": "True Branch Label"},
            {"name": "false_branch", "type": "text", "label": "False Branch Label"}
        ]
    },
    NodeType.ACTION: {
        "name": "Action",
        "description": "Execute an action",
        "icon": "⚙️",
        "color": "#f97316",
        "config_fields": [
            {"name": "action_type", "type": "select", "options": ["send_notification", "update_ehr", "generate_report", "api_call", "email"], "label": "Action Type"},
            {"name": "recipient", "type": "text", "label": "Recipient/Endpoint"},
            {"name": "message_template", "type": "textarea", "label": "Message Template"}
        ]
    },
    NodeType.AUDIT_LOG: {
        "name": "Audit Log",
        "description": "Log for HIPAA compliance",
        "icon": "📋",
        "color": "#6366f1",
        "config_fields": [
            {"name": "log_level", "type": "select", "options": ["info", "warning", "error", "phi_access"], "label": "Log Level"},
            {"name": "retention_days", "type": "number", "label": "Retention (days)", "default": 2555},  # 7 years
            {"name": "encryption", "type": "boolean", "label": "Encrypt Logs", "default": True}
        ]
    },
    NodeType.OUTPUT: {
        "name": "Output",
        "description": "Workflow output",
        "icon": "📤",
        "color": "#14b8a6",
        "config_fields": [
            {"name": "output_format", "type": "select", "options": ["json", "pdf", "hl7", "csv", "api_response"], "label": "Output Format"},
            {"name": "destination", "type": "text", "label": "Output Destination"},
            {"name": "include_audit_trail", "type": "boolean", "label": "Include Audit Trail", "default": True}
        ]
    }
}


# ==================== IN-MEMORY STORAGE ====================

workflows_db: Dict[str, Workflow] = {}
audit_logs_db: List[AuditLog] = []


# ==================== API ROUTES ====================

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Main dashboard"""
    return templates.TemplateResponse("index.html", {
        "request": request,
        "workflows": list(workflows_db.values()),
        "node_templates": NODE_TEMPLATES
    })


@app.get("/workflow/new", response_class=HTMLResponse)
async def new_workflow(request: Request):
    """Create new workflow page"""
    return templates.TemplateResponse("builder.html", {
        "request": request,
        "workflow": None,
        "node_templates": NODE_TEMPLATES,
        "mode": "create"
    })


@app.get("/workflow/{workflow_id}", response_class=HTMLResponse)
async def edit_workflow(request: Request, workflow_id: str):
    """Edit workflow page"""
    workflow = workflows_db.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return templates.TemplateResponse("builder.html", {
        "request": request,
        "workflow": workflow,
        "node_templates": NODE_TEMPLATES,
        "mode": "edit"
    })


@app.post("/api/workflows")
async def create_workflow(name: str = Form(...), description: str = Form("")):
    """Create a new workflow"""
    workflow = Workflow(
        name=name,
        description=description
    )
    workflows_db[workflow.id] = workflow
    return JSONResponse({
        "success": True,
        "workflow": workflow.dict()
    })


@app.get("/api/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get workflow by ID"""
    workflow = workflows_db.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return JSONResponse(workflow.dict())


@app.post("/api/workflows/{workflow_id}/nodes")
async def add_node(workflow_id: str, node_data: dict):
    """Add a node to workflow"""
    workflow = workflows_db.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    node = WorkflowNode(**node_data)
    workflow.nodes.append(node)
    workflow.updated_at = datetime.now().isoformat()
    
    return JSONResponse({
        "success": True,
        "node": node.dict()
    })


@app.put("/api/workflows/{workflow_id}/nodes/{node_id}")
async def update_node(workflow_id: str, node_id: str, node_data: dict):
    """Update a node"""
    workflow = workflows_db.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    for i, node in enumerate(workflow.nodes):
        if node.id == node_id:
            workflow.nodes[i] = WorkflowNode(**{**node.dict(), **node_data})
            workflow.updated_at = datetime.now().isoformat()
            return JSONResponse({
                "success": True,
                "node": workflow.nodes[i].dict()
            })
    
    raise HTTPException(status_code=404, detail="Node not found")


@app.delete("/api/workflows/{workflow_id}/nodes/{node_id}")
async def delete_node(workflow_id: str, node_id: str):
    """Delete a node"""
    workflow = workflows_db.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.nodes = [n for n in workflow.nodes if n.id != node_id]
    workflow.updated_at = datetime.now().isoformat()
    
    return JSONResponse({"success": True})


@app.post("/api/workflows/{workflow_id}/save")
async def save_workflow(workflow_id: str, workflow_data: dict):
    """Save entire workflow"""
    workflow = workflows_db.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.name = workflow_data.get("name", workflow.name)
    workflow.description = workflow_data.get("description", workflow.description)
    workflow.nodes = [WorkflowNode(**n) for n in workflow_data.get("nodes", [])]
    workflow.is_active = workflow_data.get("is_active", workflow.is_active)
    workflow.updated_at = datetime.now().isoformat()
    
    return JSONResponse({
        "success": True,
        "workflow": workflow.dict()
    })


@app.post("/api/workflows/{workflow_id}/toggle")
async def toggle_workflow(workflow_id: str):
    """Toggle workflow active status"""
    workflow = workflows_db.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.is_active = not workflow.is_active
    workflow.updated_at = datetime.now().isoformat()
    
    return JSONResponse({
        "success": True,
        "is_active": workflow.is_active
    })


@app.delete("/api/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete workflow"""
    if workflow_id in workflows_db:
        del workflows_db[workflow_id]
        return JSONResponse({"success": True})
    raise HTTPException(status_code=404, detail="Workflow not found")


@app.get("/api/workflows/{workflow_id}/audit")
async def get_audit_logs(workflow_id: str, limit: int = 50):
    """Get audit logs for workflow"""
    logs = [log.dict() for log in audit_logs_db if log.workflow_id == workflow_id]
    return JSONResponse({
        "logs": logs[:limit],
        "total": len(logs)
    })


@app.get("/api/node-templates")
async def get_node_templates():
    """Get all node templates"""
    return JSONResponse(NODE_TEMPLATES)


# ==================== SAMPLE WORKFLOWS ====================

def create_sample_workflows():
    """Create sample workflows for demo"""
    
    # Clinical Documentation Workflow
    doc_workflow = Workflow(
        id="wf-clinical-doc-001",
        name="Clinical Documentation Assistant",
        description="Automatically process clinical notes and generate structured documentation",
        nodes=[
            WorkflowNode(
                id="trigger-1",
                type=NodeType.TRIGGER,
                label="New Note Uploaded",
                position={"x": 100, "y": 100},
                config={"trigger_type": "file_upload"}
            ),
            WorkflowNode(
                id="input-1",
                type=NodeType.DATA_INPUT,
                label="Extract Note Data",
                position={"x": 100, "y": 200},
                config={"data_source": "file_upload", "phi_masking": True},
                connections=["ai-1"]
            ),
            WorkflowNode(
                id="ai-1",
                type=NodeType.AI_PROCESS,
                label="Summarize Clinical Note",
                position={"x": 100, "y": 300},
                config={"task_type": "clinical_summarization", "model": "claude-3"},
                connections=["audit-1"]
            ),
            WorkflowNode(
                id="audit-1",
                type=NodeType.AUDIT_LOG,
                label="Log PHI Access",
                position={"x": 100, "y": 400},
                config={"log_level": "phi_access"},
                connections=["output-1"]
            ),
            WorkflowNode(
                id="output-1",
                type=NodeType.OUTPUT,
                label="Save to EHR",
                position={"x": 100, "y": 500},
                config={"output_format": "hl7"}
            )
        ]
    )
    workflows_db[doc_workflow.id] = doc_workflow
    
    # Prior Authorization Workflow
    auth_workflow = Workflow(
        id="wf-prior-auth-001",
        name="Prior Authorization Checker",
        description="Check if prior authorization is required for prescribed treatments",
        nodes=[
            WorkflowNode(
                id="trigger-2",
                type=NodeType.TRIGGER,
                label="New Prescription",
                position={"x": 100, "y": 100},
                config={"trigger_type": "webhook"}
            ),
            WorkflowNode(
                id="input-2",
                type=NodeType.DATA_INPUT,
                label="Get Patient & Drug Info",
                position={"x": 100, "y": 200},
                config={"data_source": "ehr_api"},
                connections=["ai-2"]
            ),
            WorkflowNode(
                id="ai-2",
                type=NodeType.AI_PROCESS,
                label="Check PA Requirements",
                position={"x": 100, "y": 300},
                config={"task_type": "prior_auth_check"},
                connections=["decision-1"]
            ),
            WorkflowNode(
                id="decision-1",
                type=NodeType.DECISION,
                label="PA Required?",
                position={"x": 100, "y": 400},
                config={"condition": "pa_required == true"},
                connections=["action-1", "output-2"]
            ),
            WorkflowNode(
                id="action-1",
                type=NodeType.ACTION,
                label="Notify Provider",
                position={"x": 300, "y": 400},
                config={"action_type": "send_notification"},
                connections=["output-2"]
            ),
            WorkflowNode(
                id="output-2",
                type=NodeType.OUTPUT,
                label="Update Patient Record",
                position={"x": 100, "y": 500},
                config={"output_format": "json"}
            )
        ]
    )
    workflows_db[auth_workflow.id] = auth_workflow


# Initialize sample data
@app.on_event("startup")
async def startup_event():
    create_sample_workflows()


if __name__ == "__main__":
    import uvicorn
    create_sample_workflows()
    uvicorn.run(app, host="0.0.0.0", port=8001)
