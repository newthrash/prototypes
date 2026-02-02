from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime
import enum
import os

app = FastAPI(title="StatusPulse", description="Simple Team Status Pages")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Database setup
DATABASE_URL = "sqlite:///./statuspulse.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enums
class StatusEnum(str, enum.Enum):
    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    PARTIAL_OUTAGE = "partial_outage"
    MAJOR_OUTAGE = "major_outage"
    MAINTENANCE = "maintenance"

class IncidentStatus(str, enum.Enum):
    INVESTIGATING = "investigating"
    IDENTIFIED = "identified"
    MONITORING = "monitoring"
    RESOLVED = "resolved"

class IncidentImpact(str, enum.Enum):
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"

# Models
class Component(Base):
    __tablename__ = "components"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255))
    status = Column(String(20), default=StatusEnum.OPERATIONAL.value)
    group = Column(String(50), default="General")
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(String(20), default=IncidentStatus.INVESTIGATING.value)
    impact = Column(String(20), default=IncidentImpact.MINOR.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    updates = relationship("IncidentUpdate", back_populates="incident", order_by="IncidentUpdate.created_at.desc()")
    affected_components = relationship("IncidentComponent", back_populates="incident")

class IncidentUpdate(Base):
    __tablename__ = "incident_updates"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    message = Column(Text, nullable=False)
    status = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    incident = relationship("Incident", back_populates="updates")

class IncidentComponent(Base):
    __tablename__ = "incident_components"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    component_id = Column(Integer, ForeignKey("components.id"))
    
    incident = relationship("Incident", back_populates="affected_components")
    component = relationship("Component")

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper functions
def get_system_status(components):
    statuses = [c.status for c in components]
    if StatusEnum.MAJOR_OUTAGE.value in statuses:
        return "major_outage", "Major Outage"
    elif StatusEnum.PARTIAL_OUTAGE.value in statuses:
        return "partial_outage", "Partial Outage"
    elif StatusEnum.DEGRADED.value in statuses:
        return "degraded", "Degraded Performance"
    elif StatusEnum.MAINTENANCE.value in statuses:
        return "maintenance", "Under Maintenance"
    return "operational", "All Systems Operational"

def seed_data(db: Session):
    if db.query(Component).count() == 0:
        components = [
            Component(name="Website", description="Main website and landing pages", status="operational", group="Core Services", display_order=1),
            Component(name="API", description="REST API endpoints", status="operational", group="Core Services", display_order=2),
            Component(name="Database", description="Primary database cluster", status="operational", group="Infrastructure", display_order=3),
            Component(name="Authentication", description="User login and auth services", status="operational", group="Core Services", display_order=4),
            Component(name="CDN", description="Content delivery network", status="operational", group="Infrastructure", display_order=5),
            Component(name="Email Service", description="Email notifications and delivery", status="operational", group="Services", display_order=6),
        ]
        db.add_all(components)
        db.commit()

# ==================== PUBLIC ROUTES ====================

@app.get("/")
def public_status(request: Request, db: Session = Depends(get_db)):
    seed_data(db)
    components = db.query(Component).order_by(Component.display_order).all()
    active_incidents = db.query(Incident).filter(Incident.status != IncidentStatus.RESOLVED.value).order_by(Incident.created_at.desc()).all()
    recent_incidents = db.query(Incident).filter(Incident.status == IncidentStatus.RESOLVED.value).order_by(Incident.resolved_at.desc()).limit(5).all()
    system_status, status_message = get_system_status(components)
    
    return templates.TemplateResponse("public_status.html", {
        "request": request,
        "components": components,
        "active_incidents": active_incidents,
        "recent_incidents": recent_incidents,
        "system_status": system_status,
        "status_message": status_message,
        "now": datetime.utcnow()
    })

@app.get("/incident/{incident_id}")
def incident_detail(request: Request, incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    return templates.TemplateResponse("incident_detail.html", {
        "request": request,
        "incident": incident
    })

@app.get("/history")
def incident_history(request: Request, db: Session = Depends(get_db)):
    incidents = db.query(Incident).order_by(Incident.created_at.desc()).all()
    
    return templates.TemplateResponse("history.html", {
        "request": request,
        "incidents": incidents
    })

# ==================== ADMIN ROUTES ====================

@app.get("/admin")
def admin_dashboard(request: Request, db: Session = Depends(get_db)):
    components = db.query(Component).order_by(Component.display_order).all()
    active_incidents = db.query(Incident).filter(Incident.status != IncidentStatus.RESOLVED.value).order_by(Incident.created_at.desc()).all()
    
    return templates.TemplateResponse("admin/dashboard.html", {
        "request": request,
        "components": components,
        "active_incidents": active_incidents,
        "StatusEnum": StatusEnum
    })

# Component Management
@app.post("/admin/components")
def create_component(
    request: Request,
    name: str = Form(...),
    description: str = Form(""),
    group: str = Form("General"),
    db: Session = Depends(get_db)
):
    max_order = db.query(Component).count()
    component = Component(
        name=name,
        description=description,
        group=group,
        display_order=max_order + 1
    )
    db.add(component)
    db.commit()
    
    if "HX-Request" in request.headers:
        components = db.query(Component).order_by(Component.display_order).all()
        return templates.TemplateResponse("admin/components_list.html", {
            "request": request,
            "components": components,
            "StatusEnum": StatusEnum
        })
    return RedirectResponse(url="/admin", status_code=303)

@app.post("/admin/components/{component_id}/status")
def update_component_status(
    request: Request,
    component_id: int,
    status: str = Form(...),
    db: Session = Depends(get_db)
):
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    
    component.status = status
    component.updated_at = datetime.utcnow()
    db.commit()
    
    if "HX-Request" in request.headers:
        components = db.query(Component).order_by(Component.display_order).all()
        system_status, status_message = get_system_status(components)
        return templates.TemplateResponse("admin/components_list.html", {
            "request": request,
            "components": components,
            "StatusEnum": StatusEnum,
            "system_status": system_status,
            "status_message": status_message
        })
    return RedirectResponse(url="/admin", status_code=303)

@app.delete("/admin/components/{component_id}")
def delete_component(component_id: int, db: Session = Depends(get_db)):
    component = db.query(Component).filter(Component.id == component_id).first()
    if component:
        db.delete(component)
        db.commit()
    return HTMLResponse("")

# Incident Management
@app.get("/admin/incidents/new")
def new_incident_form(request: Request, db: Session = Depends(get_db)):
    components = db.query(Component).order_by(Component.display_order).all()
    return templates.TemplateResponse("admin/incident_form.html", {
        "request": request,
        "components": components,
        "IncidentStatus": IncidentStatus,
        "IncidentImpact": IncidentImpact
    })

@app.post("/admin/incidents")
def create_incident(
    request: Request,
    title: str = Form(...),
    description: str = Form(""),
    impact: str = Form(...),
    component_ids: list[int] = Form(default=[]),
    db: Session = Depends(get_db)
):
    incident = Incident(
        title=title,
        description=description,
        impact=impact,
        status=IncidentStatus.INVESTIGATING.value
    )
    db.add(incident)
    db.flush()
    
    # Add affected components
    for comp_id in component_ids:
        inc_comp = IncidentComponent(incident_id=incident.id, component_id=comp_id)
        db.add(inc_comp)
        
        # Optionally update component status based on impact
        component = db.query(Component).filter(Component.id == comp_id).first()
        if component and impact == "critical":
            component.status = StatusEnum.MAJOR_OUTAGE.value
        elif component and impact == "major":
            component.status = StatusEnum.PARTIAL_OUTAGE.value
        elif component and impact == "minor":
            component.status = StatusEnum.DEGRADED.value
    
    # Add initial update
    update = IncidentUpdate(
        incident_id=incident.id,
        message=f"We are investigating: {title}",
        status=IncidentStatus.INVESTIGATING.value
    )
    db.add(update)
    
    db.commit()
    return RedirectResponse(url="/admin", status_code=303)

@app.get("/admin/incidents/{incident_id}")
def edit_incident(request: Request, incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    components = db.query(Component).order_by(Component.display_order).all()
    affected_ids = [ic.component_id for ic in incident.affected_components]
    
    return templates.TemplateResponse("admin/incident_edit.html", {
        "request": request,
        "incident": incident,
        "components": components,
        "affected_ids": affected_ids,
        "IncidentStatus": IncidentStatus,
        "IncidentImpact": IncidentImpact
    })

@app.post("/admin/incidents/{incident_id}/update")
def add_incident_update(
    request: Request,
    incident_id: int,
    message: str = Form(...),
    status: str = Form(...),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    incident.status = status
    incident.updated_at = datetime.utcnow()
    
    if status == IncidentStatus.RESOLVED.value:
        incident.resolved_at = datetime.utcnow()
        # Reset component statuses
        for ic in incident.affected_components:
            ic.component.status = StatusEnum.OPERATIONAL.value
    
    update = IncidentUpdate(
        incident_id=incident_id,
        message=message,
        status=status
    )
    db.add(update)
    db.commit()
    
    return RedirectResponse(url=f"/admin/incidents/{incident_id}", status_code=303)

@app.delete("/admin/incidents/{incident_id}")
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident:
        db.delete(incident)
        db.commit()
    return RedirectResponse(url="/admin", status_code=303)

# API Endpoints for HTMX
@app.get("/api/components")
def api_components(db: Session = Depends(get_db)):
    components = db.query(Component).order_by(Component.display_order).all()
    return {
        "components": [
            {
                "id": c.id,
                "name": c.name,
                "status": c.status,
                "group": c.group
            } for c in components
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
